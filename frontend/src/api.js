// api.js — Task Manager API client
// Base URL: adjust if your Django backend runs on a different port
const API = "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  projects: {
    /** GET /api/projects/ */
    list: () => request("/projects/"),

    /** GET /api/projects/:id/ */
    get: (id) => request(`/projects/${id}/`),

    /** POST /api/projects/ */
    create: (data) =>
      request("/projects/", { method: "POST", body: JSON.stringify(data) }),

    /** PATCH /api/projects/:id/ */
    update: (id, data) =>
      request(`/projects/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

    /** DELETE /api/projects/:id/ */
    delete: (id) => request(`/projects/${id}/`, { method: "DELETE" }),

    /**
     * GET /api/projects/:id/tasks/
     * @param {number} id - project ID
     * @param {object} params - optional filters: { priority, status, overdue, ordering }
     */
    tasks: (id, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/projects/${id}/tasks/${q ? "?" + q : ""}`);
    },

    /** GET /api/projects/:id/overdue/ */
    overdue: (id) => request(`/projects/${id}/overdue/`),
  },

  tasks: {
    /** POST /api/tasks/ */
    create: (data) =>
      request("/tasks/", { method: "POST", body: JSON.stringify(data) }),

    /** PATCH /api/tasks/:id/ */
    update: (id, data) =>
      request(`/tasks/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),

    /** DELETE /api/tasks/:id/ */
    delete: (id) => request(`/tasks/${id}/`, { method: "DELETE" }),

    /** GET /api/tasks/overdue/ */
    overdue: () => request("/tasks/overdue/"),
  },
};