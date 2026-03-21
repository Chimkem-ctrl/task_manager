from rest_framework import serializers
from django.utils import timezone
from django.utils.timezone import make_aware, is_naive
from datetime import datetime
from .models import Project, Task


DEADLINE_FORMATS = [
    '%Y-%m-%dT%H:%M:%S.%fZ',
    '%Y-%m-%dT%H:%M:%SZ',
    '%Y-%m-%dT%H:%M:%S',
    '%Y-%m-%dT%H:%M',
    '%Y-%m-%d %H:%M:%S',
    '%Y-%m-%d %H:%M',
    '%Y-%m-%d',
]

VALID_PRIORITIES = ['low', 'medium', 'high', 'critical']
VALID_STATUSES = ['todo', 'in_progress', 'done', 'cancelled']


class FlexibleDeadlineField(serializers.Field):
    def to_internal_value(self, value):
        if not value or (isinstance(value, str) and value.strip() == ''):
            return None

        if isinstance(value, datetime):
            parsed = value
        else:
            parsed = None
            for fmt in DEADLINE_FORMATS:
                try:
                    parsed = datetime.strptime(value.strip(), fmt)
                    break
                except ValueError:
                    continue

            if parsed is None:
                raise serializers.ValidationError(
                    "Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ"
                )

        if is_naive(parsed):
            parsed = make_aware(parsed)

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if parsed < today_start:
            raise serializers.ValidationError("Deadline cannot be before today.")

        return parsed

    def to_representation(self, value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)


class TaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.ReadOnlyField()
    deadline = FlexibleDeadlineField(required=False, allow_null=True, default=None)
    priority = serializers.ChoiceField(choices=VALID_PRIORITIES, required=False, default='medium')
    status = serializers.ChoiceField(choices=VALID_STATUSES, required=False, default='todo')

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'title', 'description',
            'priority', 'status', 'deadline',
            'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_overdue']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Title cannot be empty.')
        return value.strip()

    def validate(self, data):
        if 'title' in data:
            data['title'] = data['title'].strip()
        if 'description' in data:
            data['description'] = data['description'].strip()
        return data


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    overdue_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'task_count', 'overdue_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_overdue_count(self, obj):
        from django.db.models import Q
        from django.utils import timezone
        return obj.tasks.filter(
            deadline__lt=timezone.now()
        ).exclude(
            Q(status=Task.Status.DONE) | Q(status=Task.Status.CANCELLED)
        ).count()


class ProjectDetailSerializer(ProjectSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['tasks']