export interface Task {
  id: number;
  project: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  deadline: string | null;
  is_overdue: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  task_count: number;
  overdue_count: number;
  tasks: Task[];
  created_at: string;
}