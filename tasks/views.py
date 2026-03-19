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
    queryset           = Project.objects.all().order_by('-created_at')
    serializer_class   = ProjectSerializer
    renderer_classes   = [renderers.JSONRenderer, SafeBrowsableAPIRenderer]


class TaskViewSet(viewsets.ModelViewSet):
    queryset           = Task.objects.all().order_by('deadline', '-priority')
    serializer_class   = TaskSerializer
    renderer_classes   = [renderers.JSONRenderer, SafeBrowsableAPIRenderer]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter,
                          filters.SearchFilter]
    filterset_fields   = ['status', 'priority', 'project']
    search_fields      = ['title', 'description']
    ordering_fields    = ['deadline', 'priority', 'created_at']

    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue(self, request):
        qs = Task.objects.filter(
            deadline__lt=timezone.now()
        ).exclude(
            status__in=[Task.Status.DONE, Task.Status.CANCELLED]
        ).order_by('deadline')
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
        qs = Task.objects.filter(
            deadline__date__lte=date_str
        ).order_by('deadline')
        serializer = self.get_serializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})