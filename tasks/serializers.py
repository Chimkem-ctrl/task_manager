from rest_framework import serializers
from django.utils import timezone
from .models import Project, Task


class TaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.ReadOnlyField()
    deadline = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        default=None,
        help_text="Format: YYYY-MM-DD HH:MM:SS or leave blank"
    )

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'title', 'description',
            'priority', 'status', 'deadline',
            'is_overdue', 'created_at', 'updated_at'
        ]

    def validate_deadline(self, value):
        if not value or value.strip() == '':
            return None

        # Try parsing common formats
        from datetime import datetime
        formats = [
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
        ]
        parsed = None
        for fmt in formats:
            try:
                parsed = datetime.strptime(value.strip(), fmt)
                break
            except ValueError:
                continue

        if not parsed:
            raise serializers.ValidationError(
                "Invalid date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS"
            )

        # Make timezone-aware
        from django.utils.timezone import make_aware, is_naive
        if is_naive(parsed):
            parsed = make_aware(parsed)

        # Reject past deadlines on create only
        if not self.instance and parsed < timezone.now():
            raise serializers.ValidationError(
                "Deadline must be a future date and time."
            )

        return parsed


class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'tasks', 'created_at', 'updated_at']