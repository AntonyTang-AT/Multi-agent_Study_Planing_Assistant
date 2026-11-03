import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  loadWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from "../api/workspace";
import {
  demoQuestion,
  type DemoQuestion,
} from "../mocks/mockData";
import type {
  AgentDemoFlags,
  AgentResponse,
  AgentStatus,
  Attempt,
  BlackboardEntry,
  CreatePlanOutput,
  Plan,
  UserOption,
  VerifyAnswerOutput,
} from "../types/api";

export interface ScenarioSetup {
  mode: "final_review" | "catch_up";
  subject: "math" | "physics";
  dailyMinutes: number;
  examDate: string;
  chapter: string;
}

interface PracticeState {
  status: "idle" | AgentStatus;
  message: string;
  verdict?: "passed" | "doubt" | "failed";
  hintMode: boolean;
  auditTrail: VerifyAnswerOutput["audit_trail"];
}

interface LearningState {
  hydratedUserId: string | null;
  hydrating: boolean;
  setup: ScenarioSetup;
  plan: Plan | null;
  planStatus: "idle" | AgentStatus;
  planMessage: string;
  userOptions: UserOption[];
  selectedOptionId: string;
  blackboard: BlackboardEntry[];
  question: DemoQuestion;
  practice: PracticeState;
  attempts: Attempt[];
  loading: boolean;
  error: string | null;
  demo: AgentDemoFlags;
  showIntervention: boolean;
  setSetup: (setup: ScenarioSetup) => void;
  setSelectedOption: (optionId: string) => void;
  applyPlanResponse: (response: AgentResponse) => void;
  setStoredPlan: (plan: Plan) => void;
  applyPracticeResponse: (response: AgentResponse) => void;
  setLocalPracticeResult: (passed: boolean, message: string) => void;
  resetPractice: () => void;
  applyIntervention: (response: AgentResponse) => void;
  mergeBlackboard: (entries: BlackboardEntry[]) => void;
  resolveEntry: (entryId: string) => void;
  addAttempt: (attempt: Attempt) => void;
  setAttempts: (attempts: Attempt[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDemoFlag: (flag: keyof AgentDemoFlags, value: boolean | number) => void;
  closeIntervention: () => void;
  resetDemo: () => void;
  applyWorkspace: (userId: string, snapshot: WorkspaceSnapshot) => void;
  hydrateForUser: (userId: string | null) => Promise<void>;
}

const defaultSetup: ScenarioSetup = {
  mode: "final_review",
  subject: "math",
  dailyMinutes: 45,
  examDate: "2026-11-22",
  chapter: "第 5 章 · 极限与连续",
};

const idlePractice: PracticeState = {
  status: "idle",
  message: "",
  hintMode: false,
  auditTrail: [],
};

const mergeEntries = (
  current: BlackboardEntry[],
  incoming: BlackboardEntry[],
) => {
  const entries = new Map(current.map((entry) => [entry.entry_id, entry]));
  incoming.forEach((entry) => entries.set(entry.entry_id, entry));
  return Array.from(entries.values());
};

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      hydratedUserId: null,
      hydrating: false,
      setup: defaultSetup,
      plan: null,
      planStatus: "idle",
      planMessage: "",
      userOptions: [],
      selectedOptionId: "reduce_depth",
      // 空黑板：登录后按用户从后端灌入，避免所有账号看到同一份 mock
      blackboard: [],
      question: demoQuestion,
      practice: idlePractice,
      attempts: [],
      loading: false,
      error: null,
      demo: {
        force_conflict: false,
        force_verify_fail: false,
        time_jump_days: 0,
      },
      showIntervention: false,
      setSetup: (setup) => set({ setup }),
      setSelectedOption: (selectedOptionId) => set({ selectedOptionId }),
      applyPlanResponse: (response) =>
        set((state) => {
          const output = response.output as CreatePlanOutput;
          const plan = output.plan ?? state.plan;
          const allResolved =
            response.status === "ok" &&
            response.user_options.length === 0 &&
            state.userOptions.length > 0;
          return {
            plan,
            planStatus: response.status,
            planMessage: response.message,
            userOptions: response.user_options,
            selectedOptionId:
              allResolved
                ? state.selectedOptionId
                : response.user_options[0]?.id ?? state.selectedOptionId,
            blackboard: mergeEntries(state.blackboard, response.blackboard_entries),
          };
        }),
      setStoredPlan: (plan) =>
        set({
          plan,
          planStatus: "ok",
          planMessage: "已读取当前计划",
        }),
      applyPracticeResponse: (response) =>
        set((state) => {
          const output = response.output as VerifyAnswerOutput;
          return {
            practice: {
              status: response.status,
              message: response.message,
              verdict: output.verdict,
              hintMode: Boolean(output.hint_mode),
              auditTrail: output.audit_trail ?? [],
            },
            blackboard: mergeEntries(state.blackboard, response.blackboard_entries),
          };
        }),
      setLocalPracticeResult: (passed, messageText) =>
        set({
          practice: {
            status: passed ? "ok" : "abstain",
            message: messageText,
            verdict: passed ? "passed" : "failed",
            hintMode: !passed,
            auditTrail: [
              {
                step: "local_fallback",
                summary: "Agent 不可用，使用题库标准答案完成本地判分",
              },
            ],
          },
        }),
      resetPractice: () => set({ practice: idlePractice }),
      applyIntervention: (response) =>
        set((state) => ({
          showIntervention: response.status === "need_user",
          demo: {
            ...state.demo,
            time_jump_days: 2,
          },
          blackboard: mergeEntries(state.blackboard, response.blackboard_entries),
        })),
      mergeBlackboard: (entries) =>
        set((state) => ({
          blackboard: mergeEntries(state.blackboard, entries),
        })),
      resolveEntry: (entryId) =>
        set((state) => ({
          blackboard: state.blackboard.map((entry) =>
            entry.entry_id === entryId
              ? {
                  ...entry,
                  status: "resolved",
                  resolution: {
                    action: "user_resolved",
                    note: "用户在黑板中完成裁决",
                  },
                }
              : entry,
          ),
        })),
      addAttempt: (attempt) =>
        set((state) => ({ attempts: [attempt, ...state.attempts].slice(0, 50) })),
      setAttempts: (attempts) => set({ attempts }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setDemoFlag: (flag, value) =>
        set((state) => ({
          demo: {
            ...state.demo,
            [flag]: value,
          },
        })),
      closeIntervention: () => set({ showIntervention: false }),
      resetDemo: () =>
        set({
          plan: null,
          planStatus: "idle",
          planMessage: "",
          userOptions: [],
          selectedOptionId: "reduce_depth",
          blackboard: [],
          practice: idlePractice,
          attempts: [],
          loading: false,
          error: null,
          demo: {
            force_conflict: false,
            force_verify_fail: false,
            time_jump_days: 0,
          },
          showIntervention: false,
        }),
      applyWorkspace: (userId, snapshot) =>
        set({
          hydratedUserId: userId,
          hydrating: false,
          plan: snapshot.plan,
          planStatus: snapshot.planStatus,
          planMessage: snapshot.planMessage,
          userOptions: snapshot.userOptions,
          selectedOptionId: snapshot.selectedOptionId || "reduce_depth",
          blackboard: snapshot.blackboard,
          attempts: snapshot.attempts,
          showIntervention: snapshot.showIntervention,
          setup: snapshot.setup ?? get().setup,
          practice: idlePractice,
          error: null,
          demo: {
            force_conflict: snapshot.planStatus === "conflict",
            force_verify_fail: false,
            time_jump_days: snapshot.demoTimeJumpDays,
          },
        }),
      hydrateForUser: async (userId) => {
        if (!userId) {
          set({
            hydratedUserId: null,
            hydrating: false,
            plan: null,
            planStatus: "idle",
            planMessage: "",
            userOptions: [],
            blackboard: [],
            attempts: [],
            showIntervention: false,
          });
          return;
        }
        if (get().hydratedUserId === userId && !get().hydrating) {
          return;
        }
        set({
          hydrating: true,
          hydratedUserId: userId,
          // 切换账号时先清空，避免短暂串数据
          plan: null,
          planStatus: "idle",
          planMessage: "",
          userOptions: [],
          blackboard: [],
          attempts: [],
          showIntervention: false,
        });
        try {
          const snapshot = await loadWorkspaceSnapshot();
          if (get().hydratedUserId !== userId) return;
          get().applyWorkspace(userId, snapshot);
        } catch (error) {
          if (get().hydratedUserId !== userId) return;
          set({
            hydrating: false,
            hydratedUserId: null,
            error:
              error instanceof Error
                ? error.message
                : "无法加载当前账号的学习数据",
          });
        }
      },
    }),
    {
      name: "zhixu-learning-store-v3",
      // 个人数据一律以服务端为准；本地只保留场景表单草稿，避免账号串台
      partialize: (state) => ({
        setup: state.setup,
        demo: state.demo,
      }),
    },
  ),
);
