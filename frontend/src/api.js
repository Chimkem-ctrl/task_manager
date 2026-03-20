import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Projects
export const getProjects    = ()         => api.get('/projects/');
export const getProject     = (id)       => api.get(`/projects/${id}/`);
export const createProject  = (data)     => api.post('/projects/', data);
export const updateProject  = (id, data) => api.patch(`/projects/${id}/`, data);
export const deleteProject  = (id)       => api.delete(`/projects/${id}/`);