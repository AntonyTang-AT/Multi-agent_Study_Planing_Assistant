import { apiClient } from "./client";

export interface AdminStats {
  users: {
    total: number;
    students: number;
    admins: number;
    preview: Array<{
      id: string;
      username: string | null;
      display_name: string | null;
      role: string;
      created_at: string | null;
    }>;
  };
  plans: { total: number; by_scenario: Record<string, number> };
  attempts: {
    total: number;
    by_correctness: Record<string, number>;
    by_subject: Record<string, number>;
    by_error_tag?: Record<string, number>;
    last_7_days: Array<{ date: string; attempts: number }>;
    pass_rate?: number;
    judged?: number;
    pending?: number;
  };
  blackboard: {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
  };
  ai_calls: { total: number; by_intent: Record<string, number> };
  students?: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    is_focus?: boolean;
    attempts: number;
    passed: number;
    pass_rate: number;
    open_reminders: number;
  }>;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>("/api/admin/stats");
  return data;
}
