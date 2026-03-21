from rest_framework import viewsets, filters, status, renderers
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Project, Task
from .serializers import ProjectSerializer, TaskSerializer


class SafeBrowsableAPIRenderer(renderers.BrowsableAPIRenderer):
    """
    Keeps the full white DRF browsable API screen but prevents
    the datetime empty-string crash when rendering the HTML form.
    """
    def get_rendered_html_form(self, data, view, method, request):
        try:
            return super().get_rendered_html_form(data, view, method, request)
        except Exception:
            return None


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    serializer_class = ProjectSerializer
    renderer_classes = [renderers.JSONRenderer, SafeBrowsableAPIRenderer]

    @action(detail=True, methods=['get'], url_path='tasks')
    def tasks(self, request, pk=None):
        project = self.get_object()
        qs = project.tasks.all()

        status = request.query_params.get('status')
        priority = request.query_params.get('priority')
        overdue = request.query_params.get('overdue')
        ordering = request.query_params.get('ordering')

        if status:
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if overdue and overdue.lower() in ['true', '1', 'yes']:
            qs = qs.filter(deadline__lt=timezone.now()).exclude(
                status__in=[Task.Status.DONE, Task.Status.CANCELLED]
            )
        if ordering:
            qs = qs.order_by(ordering)

        serializer = TaskSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('deadline', '-priority')
    serializer_class = TaskSerializer
    renderer_classes = [renderers.JSONRenderer, SafeBrowsableAPIRenderer]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter,
                       filters.SearchFilter]
    filterset_fields = ['status', 'priority', 'project']
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'priority', 'created_at']

    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue(self, request):
        qs = Task.objects.filter(
            deadline__lt=timezone.now()
        ).exclude(
            status__in=[Task.Status.DONE, Task.Status.CANCELLED]
        )

        project_id = request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)

        qs = qs.order_by('deadline')
        serializer = self.get_serializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'], url_path='by-deadline')
    def by_deadline(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'error': 'Provide ?date=YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            from datetime import datetime
            datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        qs = Task.objects.filter(
            deadline__date__lte=date_str
        ).order_by('deadline')
        serializer = self.get_serializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})