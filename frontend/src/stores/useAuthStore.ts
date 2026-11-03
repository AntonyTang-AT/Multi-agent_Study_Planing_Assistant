import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthRole = "student" | "admin";

export interface AuthUser {
  id: string;
  username: string | null;
  display_name: string;
  role: AuthRole | string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: "zhixu-auth" },
  ),
);

export const DEMO_ACCOUNTS = [
  {
    username: "student_math",
    password: "Demo@2026",
    label: "高数期末生",
    hint: "冲突计划 + 黑板",
  },
  {
    username: "student_physics",
    password: "Demo@2026",
    label: "大物跟课生",
    hint: "跟课计划 + 混合作答",
  },
  {
    username: "student_catchup",
    password: "Demo@2026",
    label: "进度落后生",
    hint: "主动干预场景",
  },
  {
    username: "admin",
    password: "Admin@2026",
    label: "管理员",
    hint: "全站统计看板",
  },
] as const;
