import axios from "axios";
import { getAccessToken } from "../utils/token";

const BASE = "http://127.0.0.1:8000/api";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getAccessToken()}` },
});

// ── Projects ──────────────────────────────────────────
export const getProjects = () =>
  axios.get(`${BASE}/projects/`, authHeaders());

export const createProject = (data: {
  name: string;
  description?: string;
}) => axios.post(`${BASE}/projects/`, data, authHeaders());

export const getProject = (id: number) =>
  axios.get(`${BASE}/projects/${id}/`, authHeaders());

export const updateProject = (id: number, data: object) =>
  axios.patch(`${BASE}/projects/${id}/`, data, authHeaders());

export const deleteProject = (id: number) =>
  axios.delete(`${BASE}/projects/${id}/`, authHeaders());

// ── Tasks ─────────────────────────────────────────────
export const getTasks = () =>
  axios.get(`${BASE}/tasks/`, authHeaders());

export const createTask = (data: {
  project: number;
  title: string;
  description?: string;
  priority: string;
  status?: string;
  deadline?: string;
}) => axios.post(`${BASE}/tasks/`, data, authHeaders());

export const updateTask = (id: number, data: object) =>
  axios.patch(`${BASE}/tasks/${id}/`, data, authHeaders());

export const deleteTask = (id: number) =>
  axios.delete(`${BASE}/tasks/${id}/`, authHeaders());

export const getOverdueTasks = () =>
  axios.get(`${BASE}/tasks/overdue/`, authHeaders());

export const getTasksByDeadline = (date: string) =>
  axios.get(`${BASE}/tasks/by-deadline/?date=${date}`, authHeaders());