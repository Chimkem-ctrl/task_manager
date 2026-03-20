import { useState, useEffect } from 'react';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../api';
import ProjectForm from './ProjectForm';

export default function ProjectList() {
  const [projects, setProjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingProject, setEditing]  = useState(null);
  const [error, setError]             = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      setProjects(res.data);
    } catch {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (data) => {
    try {
      await createProject(data);
      setShowForm(false);
      fetchProjects();
    } catch {
      setError('Failed to create project.');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateProject(editingProject.id, data);
      setEditing(null);
      fetchProjects();
    } catch {
      setError('Failed to update project.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await deleteProject(id);
      fetchProjects();
    } catch {
      setError('Failed to delete project.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📁 Projects</h1>
        <button
          onClick={() => { setShowForm(true); setEditing(null); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && !editingProject && (
        <div className="mb-6 p-5 bg-white rounded-xl shadow border">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">New Project</h2>
          <ProjectForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          No projects yet. Create your first one!
        </p>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow border p-5"
            >
              {/* Edit Form inline */}
              {editingProject?.id === project.id ? (
                <>
                  <h2 className="text-lg font-semibold mb-4 text-gray-700">
                    Edit Project
                  </h2>
                  <ProjectForm
                    initial={editingProject}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditing(null)}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {project.name}
                      </h2>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {project.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        🗂 {project.tasks?.length ?? 0} task(s) &nbsp;·&nbsp;
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setEditing(project)}
                        className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}