import {
  fetchAttempts,
  fetchBlackboard,
  fetchCurrentPlan,
} from "./backend";
import type {
  AgentStatus,
  Attempt,
  BlackboardEntry,
  Plan,
  Scenario,
  Subject,
  UserOption,
} from "../types/api";
import type { ScenarioSetup } from "../stores/useLearningStore";

export interface DemoPlanMeta {
  plan_status?: AgentStatus | "idle";
  plan_message?: string;
  user_options?: UserOption[];
  selected_option_id?: string;
  show_intervention?: boolean;
  setup?: Partial<ScenarioSetup>;
}

export interface WorkspaceSnapshot {
  plan: Plan | null;
  planStatus: "idle" | AgentStatus;
  planMessage: string;
  userOptions: UserOption[];
  selectedOptionId: string;
  blackboard: BlackboardEntry[];
  attempts: Attempt[];
  showIntervention: boolean;
  setup: ScenarioSetup | null;
  demoTimeJumpDays: number;
}

type PlanWithDemo = Plan & { _demo?: DemoPlanMeta };

const defaultSetup = (plan: Plan | null, meta?: DemoPlanMeta): ScenarioSetup => {
  if (meta?.setup) {
    return {
      mode: (meta.setup.mode as Scenario) || "final_review",
      subject: (meta.setup.subject as Subject) || "math",
      dailyMinutes: meta.setup.dailyMinutes ?? plan?.daily_minutes_budget ?? 45,
      examDate: meta.setup.examDate ?? "2026-11-22",
      chapter: meta.setup.chapter ?? "第 2 章",
    };
  }
  const firstSubject = plan?.tasks?.[0]?.subject ?? "math";
  return {
    mode: (plan?.scenario as Scenario) || "final_review",
    subject: firstSubject,
    dailyMinutes: plan?.daily_minutes_budget ?? 45,
    examDate: "2026-11-22",
    chapter: "当前章节",
  };
};

const stripDemo = (raw: PlanWithDemo | null): {
  plan: Plan | null;
  meta: DemoPlanMeta;
} => {
  if (!raw) return { plan: null, meta: {} };
  const { _demo, ...plan } = raw;
  return { plan: plan as Plan, meta: _demo ?? {} };
};

/** 按当前登录用户拉取计划 / 黑板 / 作答，并解析种子里的 `_demo` 展示态。 */
export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const [rawPlan, blackboard, attempts] = await Promise.all([
    fetchCurrentPlan() as Promise<PlanWithDemo | null>,
    fetchBlackboard(),
    fetchAttempts(),
  ]);
  const { plan, meta } = stripDemo(rawPlan);
  const openConflict = blackboard.some(
    (entry) => entry.type === "conflict" && entry.status === "open",
  );
  const openIntervention = blackboard.some(
    (entry) => entry.type === "intervention" && entry.status === "open",
  );
  const planStatus =
    meta.plan_status ||
    (openConflict ? "conflict" : plan ? "ok" : "idle");

  return {
    plan,
    planStatus,
    planMessage:
      meta.plan_message ||
      (plan ? "已读取当前账号的学习计划" : ""),
    userOptions:
      meta.user_options ||
      (openConflict
        ? [
            { id: "extend_time", label: "延长每日学习时间" },
            { id: "reduce_depth", label: "降低复习深度" },
            { id: "adjust_goal", label: "调整目标" },
          ]
        : []),
    selectedOptionId: meta.selected_option_id || "reduce_depth",
    blackboard,
    attempts,
    showIntervention: Boolean(meta.show_intervention || openIntervention),
    setup: plan ? defaultSetup(plan, meta) : null,
    demoTimeJumpDays: openIntervention ? 3 : 0,
  };
}
