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

/** 短账号短密码，方便手输；也可点芯片一键填入 */
export const DEMO_ACCOUNTS = [
  {
    username: "math",
    password: "demo",
    label: "math / demo",
    hint: "高数冲突计划",
  },
  {
    username: "phys",
    password: "demo",
    label: "phys / demo",
    hint: "大物跟课",
  },
  {
    username: "catch",
    password: "demo",
    label: "catch / demo",
    hint: "主动干预",
  },
  {
    username: "admin",
    password: "admin",
    label: "admin / admin",
    hint: "管理看板",
  },
] as const;
