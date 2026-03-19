Task Manager API

A REST API for managing projects and tasks with priority levels and deadlines.

Tech Stack
- Python 3.10+
- Django 4
- Django REST Framework
- PostgreSQL

Setup Instructions

1. Clone the repository
git clone https://github.com/yourusername/task_manager.git
cd task_manager

2. Create virtual environment
python -m venv venv
venv\Scripts\activate

3. Install dependencies
pip install -r requirements.txt

4. Create .env file
Create a `.env` file in the root folder with these values:
SECRET_KEY=your-secret-key
DB_NAME=task_manager_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

5. Run migrations
python manage.py makemigrations
python manage.py migrate

6. Create superuser
python manage.py createsuperuser

7. Start server
python manage.py runserver

API Endpoints

| Method | URL | Description |
| GET | /api/projects/ | List all projects |
| POST | /api/projects/ | Create a project |
| GET | /api/projects/{id}/ | Get one project |
| PATCH | /api/projects/{id}/ | Update a project |
| DELETE | /api/projects/{id}/ | Delete a project |
| GET | /api/tasks/ | List all tasks |
| POST | /api/tasks/ | Create a task |
| GET | /api/tasks/{id}/ | Get one task |
| PATCH | /api/tasks/{id}/ | Update a task |
| DELETE | /api/tasks/{id}/ | Delete a task |
| GET | /api/tasks/overdue/ | Get overdue tasks |
| GET | /api/tasks/by-deadline/?date=YYYY-MM-DD | Filter by deadline |
