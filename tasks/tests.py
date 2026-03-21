from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Project, Task


class TaskApiTests(APITestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Test Project', description='')
        self.task_1 = Task.objects.create(
            project=self.project,
            title='Critical task',
            priority='critical',
            status='todo'
        )
        self.task_2 = Task.objects.create(
            project=self.project,
            title='Low task',
            priority='low',
            status='done'
        )

    def test_task_list_filters_by_priority(self):
        url = reverse('task-list') + f'?project={self.project.id}&priority=critical'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Default pagination is not enabled, so response is a list
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['priority'], 'critical')

    def test_project_tasks_action_works(self):
        url = reverse('project-tasks', kwargs={'pk': self.project.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_overdue_filter_on_project_tasks(self):
        self.task_1.deadline = None
        self.task_1.save()
        self.task_2.deadline = None
        self.task_2.save()
        url = reverse('project-tasks', kwargs={'pk': self.project.id}) + '?overdue=true'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_invalid_status_returns_bad_request_via_serializer(self):
        url = reverse('task-list')
        response = self.client.post(url, {
            'project': self.project.id,
            'title': 'New Task',
            'status': 'broken-status',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

