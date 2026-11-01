import { create } from "zustand";

import type { Scenario, Subject } from "../types/api";

interface AppShellState {
  scenario: Scenario;
  subject: Subject;
  dailyMinutes: number;
  setScenario: (scenario: Scenario) => void;
  setSubject: (subject: Subject) => void;
  setDailyMinutes: (minutes: number) => void;
}

export const useAppStore = create<AppShellState>((set) => ({
  scenario: "final_review",
  subject: "math",
  dailyMinutes: 45,
  setScenario: (scenario) => set({ scenario }),
  setSubject: (subject) => set({ subject }),
  setDailyMinutes: (dailyMinutes) => set({ dailyMinutes }),
}));
