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
    priority = serializers.CharField(required=False, default='medium')
    status = serializers.CharField(required=False, default='todo')

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'title', 'description',
            'priority', 'status', 'deadline',
            'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_overdue']

    def validate_priority(self, value):
        if value not in VALID_PRIORITIES:
            raise serializers.ValidationError(
                f'"{value}" is not valid. Options: {", ".join(VALID_PRIORITIES)}'
            )
        return value

    def validate_status(self, value):
        if value not in VALID_STATUSES:
            raise serializers.ValidationError(
                f'"{value}" is not valid. Options: {", ".join(VALID_STATUSES)}'
            )
        return value


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
        return sum(1 for t in obj.tasks.all() if t.is_overdue)


class ProjectDetailSerializer(ProjectSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['tasks']