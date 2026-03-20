import { useState, useEffect, useCallback } from "react";

// ─── API LAYER ────────────────────────────────────────────────────────────────
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

const api = {
  projects: {
    list: () => request("/projects/"),
    get: (id) => request(`/projects/${id}/`),
    create: (data) => request("/projects/", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/projects/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => request(`/projects/${id}/`, { method: "DELETE" }),
    tasks: (id, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/projects/${id}/tasks/${q ? "?" + q : ""}`);
    },
  },
  tasks: {
    create: (data) => request("/tasks/", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/tasks/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => request(`/tasks/${id}/`, { method: "DELETE" }),
  },
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#ff3b5c", bg: "rgba(255,59,92,0.12)" },
  high:     { label: "High",     color: "#ff8c42", bg: "rgba(255,140,66,0.12)" },
  medium:   { label: "Medium",   color: "#f5c842", bg: "rgba(245,200,66,0.12)" },
  low:      { label: "Low",      color: "#4cc9a4", bg: "rgba(76,201,164,0.12)" },
};

const STATUS_CONFIG = {
  todo:        { label: "To Do",       color: "#8b8fa8" },
  in_progress: { label: "In Progress", color: "#5b9cf6" },
  done:        { label: "Done",        color: "#4cc9a4" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatDeadline(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toInputDatetime(dt) {
  if (!dt) return "";
  return new Date(dt).toISOString().slice(0, 16);
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0e12;
    --surface: #13141a;
    --surface2: #1a1c24;
    --surface3: #21232e;
    --border: rgba(255,255,255,0.07);
    --text: #e8e9f0;
    --muted: #5a5d72;
    --accent: #5b9cf6;
    --accent-glow: rgba(91,156,246,0.2);
    --danger: #ff3b5c;
    --success: #4cc9a4;
    --font: 'Syne', sans-serif;
    --mono: 'JetBrains Mono', monospace;
    --radius: 10px;
    --transition: 0.2s cubic-bezier(0.4,0,0.2,1);
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }

  /* LAYOUT */
  .app { display: flex; height: 100vh; overflow: hidden; }
  .sidebar { width: 280px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
  .main { flex: 1; overflow-y: auto; background: var(--bg); }

  /* SIDEBAR */
  .sidebar-header { padding: 24px 20px 16px; border-bottom: 1px solid var(--border); }
  .app-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .logo-icon { width: 32px; height: 32px; background: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .logo-text { font-size: 15px; font-weight: 700; letter-spacing: 0.05em; }
  .logo-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); }

  .new-project-btn { width: 100%; padding: 10px 14px; background: var(--accent); color: white; border: none; border-radius: var(--radius); font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: var(--transition); letter-spacing: 0.02em; }
  .new-project-btn:hover { background: #74adf8; transform: translateY(-1px); }

  .sidebar-projects { flex: 1; overflow-y: auto; padding: 12px 12px; }
  .sidebar-label { font-size: 10px; font-family: var(--mono); color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; padding: 0 8px; margin-bottom: 8px; }

  .project-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: var(--transition); border: 1px solid transparent; margin-bottom: 4px; }
  .project-item:hover { background: var(--surface2); }
  .project-item.active { background: var(--surface2); border-color: var(--border); }
  .project-item-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .project-item-meta { display: flex; gap: 10px; font-size: 11px; font-family: var(--mono); color: var(--muted); }
  .overdue-badge { color: var(--danger); }

  /* MAIN CONTENT */
  .main-header { padding: 28px 32px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; background: var(--surface); position: sticky; top: 0; z-index: 10; }
  .main-title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
  .main-desc { font-size: 13px; color: var(--muted); margin-top: 4px; }
  .header-actions { display: flex; gap: 10px; flex-shrink: 0; }

  /* FILTERS BAR */
  .filters-bar { padding: 14px 32px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: var(--surface); }
  .filter-chip { padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-family: var(--font); font-size: 12px; cursor: pointer; transition: var(--transition); }
  .filter-chip:hover { border-color: var(--accent); color: var(--accent); }
  .filter-chip.active { background: var(--accent-glow); border-color: var(--accent); color: var(--accent); }
  .filter-sep { width: 1px; height: 20px; background: var(--border); }
  .filter-label { font-size: 11px; font-family: var(--mono); color: var(--muted); }

  /* TASKS GRID */
  .tasks-area { padding: 24px 32px; }
  .tasks-list { display: flex; flex-direction: column; gap: 10px; }

  /* TASK CARD */
  .task-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; transition: var(--transition); position: relative; overflow: hidden; }
  .task-card:hover { border-color: rgba(255,255,255,0.13); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .task-card.overdue { border-left: 3px solid var(--danger); }
  .task-card-top { display: flex; align-items: flex-start; gap: 12px; }
  .task-check { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; cursor: pointer; margin-top: 2px; transition: var(--transition); display: flex; align-items: center; justify-content: center; }
  .task-check:hover { border-color: var(--accent); }
  .task-check.done { background: var(--success); border-color: var(--success); }
  .task-check.in_progress { border-color: var(--accent); }
  .task-card-body { flex: 1; min-width: 0; }
  .task-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .task-title.done { text-decoration: line-through; color: var(--muted); }
  .task-desc { font-size: 12px; color: var(--muted); margin-bottom: 10px; line-height: 1.5; }
  .task-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .priority-badge { font-size: 11px; font-family: var(--mono); font-weight: 500; padding: 2px 8px; border-radius: 4px; }
  .deadline-badge { font-size: 11px; font-family: var(--mono); color: var(--muted); display: flex; align-items: center; gap: 4px; }
  .deadline-badge.overdue { color: var(--danger); }
  .status-badge { font-size: 11px; font-family: var(--mono); padding: 2px 8px; border-radius: 4px; }
  .task-actions { display: flex; gap: 6px; opacity: 0; transition: var(--transition); }
  .task-card:hover .task-actions { opacity: 1; }

  /* BUTTONS */
  .btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-family: var(--font); font-size: 12px; font-weight: 600; cursor: pointer; transition: var(--transition); display: flex; align-items: center; gap: 6px; letter-spacing: 0.02em; }
  .btn:hover { background: var(--surface3); border-color: rgba(255,255,255,0.15); }
  .btn-primary { background: var(--accent); border-color: var(--accent); color: white; }
  .btn-primary:hover { background: #74adf8; border-color: #74adf8; }
  .btn-danger { background: rgba(255,59,92,0.12); border-color: rgba(255,59,92,0.3); color: var(--danger); }
  .btn-danger:hover { background: rgba(255,59,92,0.2); }
  .btn-icon { padding: 6px 8px; min-width: unset; font-size: 13px; }
  .btn-sm { padding: 5px 10px; font-size: 11px; }

  /* EMPTY STATE */
  .empty-state { padding: 60px 32px; text-align: center; }
  .empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.4; }
  .empty-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--muted); }
  .empty-sub { font-size: 13px; color: var(--muted); opacity: 0.6; }

  /* WELCOME */
  .welcome { padding: 60px 32px; text-align: center; }
  .welcome-title { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 12px; }
  .welcome-title span { color: var(--accent); }
  .welcome-sub { font-size: 15px; color: var(--muted); }

  /* STATS ROW */
  .stats-row { display: flex; gap: 12px; padding: 20px 32px 0; }
  .stat-card { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; }
  .stat-num { font-size: 22px; font-weight: 800; font-family: var(--mono); letter-spacing: -0.02em; }
  .stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; font-family: var(--mono); }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 480px; box-shadow: 0 24px 64px rgba(0,0,0,0.5); animation: slideUp 0.2s cubic-bezier(0.4,0,0.2,1); }
  .modal-header { padding: 22px 24px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-size: 16px; font-weight: 700; }
  .modal-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }

  /* FORM */
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-size: 11px; font-family: var(--mono); color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .field input, .field textarea, .field select { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; color: var(--text); font-family: var(--font); font-size: 13px; outline: none; transition: var(--transition); width: 100%; }
  .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
  .field textarea { resize: vertical; min-height: 80px; }
  .field select option { background: var(--surface2); }
  .field-row { display: flex; gap: 12px; }
  .field-row .field { flex: 1; }
  .error-text { font-size: 11px; color: var(--danger); font-family: var(--mono); }

  /* STATUS CYCLE */
  .status-cycle { cursor: pointer; transition: var(--transition); }
  .status-cycle:hover { opacity: 0.7; }

  /* ANIMATIONS */
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 3px; }

  .divider-label { font-size: 10px; font-family: var(--mono); color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; padding: 8px 0 4px; opacity: 0.6; }

  .loading { display: flex; align-items: center; justify-content: center; padding: 60px; color: var(--muted); font-family: var(--mono); font-size: 13px; gap: 10px; }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .close-btn { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; padding: 2px 6px; border-radius: 6px; transition: var(--transition); }
  .close-btn:hover { background: var(--surface2); color: var(--text); }
`;

// ─── PROJECT MODAL ────────────────────────────────────────────────────────────
function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({ name: project?.name || "", description: project?.description || "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Project name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const result = project
        ? await api.projects.update(project.id, form)
        : await api.projects.create(form);
      onSave(result);
    } catch (e) {
      setError("Failed to save project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{project ? "Edit Project" : "New Project"}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Project Name</label>
            <input
              autoFocus
              placeholder="e.g. Website Redesign"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea
              placeholder="What is this project about?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <span className="error-text">{error}</span>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : project ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TASK MODAL ───────────────────────────────────────────────────────────────
function TaskModal({ task, projectId, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "medium",
    status: task?.status || "todo",
    deadline: task?.deadline ? toInputDatetime(task.deadline) : "",
    project: projectId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Task title is required"); return; }
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      };
      const result = task
        ? await api.tasks.update(task.id, payload)
        : await api.tasks.create(payload);
      onSave(result);
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("past")) setError("Deadline cannot be in the past.");
      else setError("Failed to save task. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{task ? "Edit Task" : "New Task"}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Task Title</label>
            <input
              autoFocus
              placeholder="e.g. Design landing page hero"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea
              placeholder="More details about this task…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Deadline (optional)</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
          {error && <span className="error-text">{error}</span>}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : task ? "Save Changes" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const priority = PRIORITY_CONFIG[task.priority];
  const statusCfg = STATUS_CONFIG[task.status];
  const cycleStatus = () => {
    const order = ["todo", "in_progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    onStatusChange(task.id, next);
  };

  return (
    <div className={`task-card ${task.is_overdue ? "overdue" : ""}`}>
      <div className="task-card-top">
        <div
          className={`task-check ${task.status}`}
          onClick={cycleStatus}
          title={`Status: ${statusCfg.label} — click to cycle`}
        >
          {task.status === "done" && <span style={{ color: "white", fontSize: 10 }}>✓</span>}
          {task.status === "in_progress" && <span style={{ color: "var(--accent)", fontSize: 8 }}>●</span>}
        </div>
        <div className="task-card-body">
          <div className={`task-title ${task.status}`}>{task.title}</div>
          {task.description && <div className="task-desc">{task.description}</div>}
          <div className="task-meta">
            <span
              className="priority-badge"
              style={{ color: priority.color, background: priority.bg }}
            >
              {priority.label}
            </span>
            <span
              className="status-badge status-cycle"
              style={{ color: statusCfg.color, background: `${statusCfg.color}18`, cursor: "pointer" }}
              onClick={cycleStatus}
              title="Click to cycle status"
            >
              {statusCfg.label}
            </span>
            {task.deadline && (
              <span className={`deadline-badge ${task.is_overdue ? "overdue" : ""}`}>
                {task.is_overdue ? "⚠ " : "⏱ "}
                {task.is_overdue ? "Overdue · " : ""}{formatDeadline(task.deadline)}
              </span>
            )}
          </div>
        </div>
        <div className="task-actions">
          <button className="btn btn-icon btn-sm" onClick={() => onEdit(task)} title="Edit task">✎</button>
          <button className="btn btn-icon btn-sm btn-danger" onClick={() => onDelete(task)} title="Delete task">✕</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROJECT VIEW ─────────────────────────────────────────────────────────────
function ProjectView({ project, onProjectEdit, onProjectDelete }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ priority: "", status: "", overdue: "" });
  const [modal, setModal] = useState(null); // null | 'newTask' | 'editTask' | 'deleteTask'
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;
      if (filters.overdue) params.overdue = "true";
      const data = await api.projects.tasks(project.id, params);
      setTasks(data);
    } catch (e) {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [project.id, filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.tasks.update(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus, is_overdue: t.is_overdue && newStatus !== "done" } : t));
    } catch {}
  };

  const handleTaskSave = () => {
    setModal(null);
    setSelectedTask(null);
    fetchTasks();
  };

  const handleTaskDelete = async () => {
    try {
      await api.tasks.delete(selectedTask.id);
      setModal(null);
      setSelectedTask(null);
      fetchTasks();
    } catch {}
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => t.is_overdue).length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;

  const toggleFilter = (key, val) =>
    setFilters((prev) => ({ ...prev, [key]: prev[key] === val ? "" : val }));

  return (
    <>
      <div className="main-header">
        <div>
          <div className="main-title">{project.name}</div>
          {project.description && <div className="main-desc">{project.description}</div>}
        </div>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={() => onProjectEdit(project)}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={() => onProjectDelete(project)}>Delete</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal("newTask")}>
            + New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--accent)" }}>{inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--success)" }}>{done}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: overdue > 0 ? "var(--danger)" : "var(--muted)" }}>{overdue}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <span className="filter-label">Priority:</span>
        {["low", "medium", "high", "critical"].map((p) => (
          <button
            key={p}
            className={`filter-chip ${filters.priority === p ? "active" : ""}`}
            onClick={() => toggleFilter("priority", p)}
            style={filters.priority === p ? { borderColor: PRIORITY_CONFIG[p].color, color: PRIORITY_CONFIG[p].color, background: PRIORITY_CONFIG[p].bg } : {}}
          >
            {PRIORITY_CONFIG[p].label}
          </button>
        ))}
        <div className="filter-sep" />
        <span className="filter-label">Status:</span>
        {["todo", "in_progress", "done"].map((s) => (
          <button
            key={s}
            className={`filter-chip ${filters.status === s ? "active" : ""}`}
            onClick={() => toggleFilter("status", s)}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
        <div className="filter-sep" />
        <button
          className={`filter-chip ${filters.overdue ? "active" : ""}`}
          onClick={() => toggleFilter("overdue", "true")}
          style={filters.overdue ? { borderColor: "var(--danger)", color: "var(--danger)", background: "rgba(255,59,92,0.1)" } : {}}
        >
          ⚠ Overdue only
        </button>
      </div>

      {/* Tasks */}
      <div className="tasks-area">
        {loading ? (
          <div className="loading"><div className="spinner" />Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">
              {Object.values(filters).some(Boolean) ? "No tasks match your filters" : "No tasks yet"}
            </div>
            <div className="empty-sub">
              {Object.values(filters).some(Boolean) ? "Try adjusting your filters" : "Click '+ New Task' to get started"}
            </div>
          </div>
        ) : (
          <div className="tasks-list">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => { setSelectedTask(t); setModal("editTask"); }}
                onDelete={(t) => { setSelectedTask(t); setModal("deleteTask"); }}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "newTask" && (
        <TaskModal
          projectId={project.id}
          onClose={() => setModal(null)}
          onSave={handleTaskSave}
        />
      )}
      {modal === "editTask" && selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={project.id}
          onClose={() => { setModal(null); setSelectedTask(null); }}
          onSave={handleTaskSave}
        />
      )}
      {modal === "deleteTask" && selectedTask && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete "${selectedTask.title}"? This cannot be undone.`}
          onConfirm={handleTaskDelete}
          onClose={() => { setModal(null); setSelectedTask(null); }}
        />
      )}
    </>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [modal, setModal] = useState(null); // 'newProject' | 'editProject' | 'deleteProject'
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleProjectSave = (saved) => {
    setModal(null);
    setSelectedProject(null);
    fetchProjects();
    if (saved) setActiveProject(saved);
  };

  const handleProjectDelete = async () => {
    try {
      await api.projects.delete(selectedProject.id);
      if (activeProject?.id === selectedProject.id) setActiveProject(null);
      setModal(null);
      setSelectedProject(null);
      fetchProjects();
    } catch {}
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="app-logo">
              <div className="logo-icon">⚡</div>
              <div>
                <div className="logo-text">TaskFlow</div>
                <div className="logo-sub">task_manager</div>
              </div>
            </div>
            <button className="new-project-btn" onClick={() => setModal("newProject")}>
              <span>+</span> New Project
            </button>
          </div>
          <div className="sidebar-projects">
            <div className="sidebar-label">Projects</div>
            {loadingProjects ? (
              <div className="loading" style={{ padding: "20px 0" }}>
                <div className="spinner" />
              </div>
            ) : projects.length === 0 ? (
              <div style={{ padding: "12px 8px", fontSize: 12, color: "var(--muted)" }}>
                No projects yet
              </div>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  className={`project-item ${activeProject?.id === p.id ? "active" : ""}`}
                  onClick={() => setActiveProject(p)}
                >
                  <div className="project-item-name">{p.name}</div>
                  <div className="project-item-meta">
                    <span>{p.task_count} tasks</span>
                    {p.overdue_count > 0 && (
                      <span className="overdue-badge">⚠ {p.overdue_count}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {activeProject ? (
            <ProjectView
              key={activeProject.id}
              project={activeProject}
              onProjectEdit={(p) => { setSelectedProject(p); setModal("editProject"); }}
              onProjectDelete={(p) => { setSelectedProject(p); setModal("deleteProject"); }}
            />
          ) : (
            <div className="welcome">
              <div className="welcome-title">
                Manage Tasks<br />
                <span>Without the Chaos</span>
              </div>
              <div className="welcome-sub" style={{ marginTop: 12 }}>
                Select a project from the sidebar, or create a new one to get started.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Project Modals */}
      {modal === "newProject" && (
        <ProjectModal onClose={() => setModal(null)} onSave={handleProjectSave} />
      )}
      {modal === "editProject" && selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => { setModal(null); setSelectedProject(null); }}
          onSave={handleProjectSave}
        />
      )}
      {modal === "deleteProject" && selectedProject && (
        <ConfirmModal
          title="Delete Project"
          message={`Delete "${selectedProject.name}" and all its tasks? This cannot be undone.`}
          onConfirm={handleProjectDelete}
          onClose={() => { setModal(null); setSelectedProject(null); }}
        />
      )}
    </>
  );
}