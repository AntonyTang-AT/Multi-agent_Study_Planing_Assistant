import type {
  AgentIntent,
  AgentRequest,
  AgentResponse,
  AgentStatus,
  BlackboardEntry,
  Plan,
  PlanTask,
  Question,
  UserOption,
  VerifyAnswerOutput,
} from "../types/api";
import { demoQuestion, initialBlackboard } from "./mockData";
import type { ScenarioInput } from "./mockData";

const delay = (milliseconds = 520) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const makeId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

const mergeBlackboard = (
  current: BlackboardEntry[],
  incoming: BlackboardEntry[],
) => {
  const entries = new Map(current.map((entry) => [entry.entry_id, entry]));
  incoming.forEach((entry) => entries.set(entry.entry_id, entry));
  return Array.from(entries.values());
};

const buildTask = (
  day: number,
  action: string,
  object: string,
  minutes: number,
  completionCriteria: string,
  load: PlanTask["load"],
  knowledgeId: string,
): PlanTask => ({
  day,
  action,
  object,
  minutes,
  completion_criteria: completionCriteria,
  load,
  knowledge_ids: [knowledgeId],
  subject: "math",
});

const createPlan = (scenario: ScenarioInput): Plan => ({
  scenario: scenario.scenario,
  goal: scenario.scenario === "final_review" ? "期末过线并补齐极限链路" : "跟课补齐先修缺口",
  daily_minutes_budget: scenario.dailyMinutes,
  days_left: 14,
  tasks: [
    buildTask(
      1,
      "回看",
      "极限存在准则",
      15,
      "写出一页概念对照，能说明两个准则的适用条件",
      "low",
      "math.a1.ch02",
    ),
    buildTask(
      2,
      "练习",
      "夹逼定理基础题",
      Math.min(45, Math.max(15, scenario.dailyMinutes - 15)),
      "完成 3 道基础题，并独立写出放缩方向",
      "medium",
      "math.a1.ch02",
    ),
    buildTask(
      3,
      "整理",
      "极限证明与跨知识点连接",
      48,
      "完成证明卡片，标注每一步依据",
      "high",
      "math.a1.ch04",
    ),
  ],
});

const conflictOptions: UserOption[] = [
  { id: "extend_time", label: "延长每日学习时间" },
  { id: "reduce_depth", label: "降低复习深度" },
  { id: "adjust_goal", label: "调整目标" },
];

const baseMeta = {
  agent_version: "mock-0.1.0",
  latency_ms: 520,
};

const response = <TIntent extends AgentIntent>(
  _intent: TIntent,
  status: AgentStatus,
  messageText: string,
  output: AgentResponse<TIntent>["output"],
  options: UserOption[] = [],
  entries: BlackboardEntry[] = [],
  requiresApproval = false,
): AgentResponse<TIntent> => {
  const suffix = makeId("task");
  return {
    request_id: makeId("request"),
    task_id: suffix,
    status,
    message: messageText,
    output,
    blackboard_entries: entries,
    user_options: options,
    evidence_refs: [],
    requires_approval: requiresApproval,
    meta: baseMeta,
  };
};

export async function invokeMockAgent<TIntent extends AgentIntent>(
  intent: TIntent,
  request: AgentRequest,
): Promise<AgentResponse<TIntent>> {
  await delay();

  if (intent === "create_plan") {
    const scenario = (request.input?.scenarioConfig ?? {}) as ScenarioInput;
    const forceConflict =
      request.demo?.force_conflict ??
      (scenario.dailyMinutes ?? 45) <= 45;
    const plan = createPlan(scenario);
    const conflictEntry: BlackboardEntry = {
      entry_id: "bb_plan_conflict",
      type: "conflict",
      summary: "计划第 3 天预计 48 分钟，叠加复习任务后超出时间预算",
      severity: "high",
      evidence_refs: ["plan#day3", "constraint#daily_minutes"],
      status: "open",
    };

    return response(
      "create_plan",
      forceConflict ? "conflict" : "ok",
      forceConflict
        ? "计划审计发现硬约束冲突，等待用户裁决"
        : "计划已通过审计，可以进入学习队列",
      {
        plan,
        audit_issues: forceConflict
          ? [{ code: "daily_budget_exceeded", day: 3 }]
          : [],
      },
      forceConflict ? conflictOptions : [],
      forceConflict ? [conflictEntry] : [],
      forceConflict,
    ) as AgentResponse<TIntent>;
  }

  if (intent === "arbitrate") {
    const previous = (request.input?.plan ?? {}) as Plan;
    const optionId = String(request.input?.option_id ?? "extend_time");
    const tasks = previous.tasks.map((task) =>
      optionId === "extend_time" && task.day === 3
        ? { ...task, minutes: 48 }
        : optionId === "reduce_depth" && task.day === 3
          ? {
              ...task,
              object: "极限证明关键步骤",
              minutes: 30,
              completion_criteria: "只保留证明骨架与关键不等式",
            }
          : optionId === "adjust_goal" && task.day === 3
            ? {
                ...task,
                object: "第 5 章基础综合题",
                minutes: 35,
                completion_criteria: "只覆盖第 5 章，不进入跨章综合",
              }
            : task,
    );
    const updatedPlan: Plan = {
      ...previous,
      daily_minutes_budget:
        optionId === "extend_time" ? Math.max(previous.daily_minutes_budget, 60) : previous.daily_minutes_budget,
      tasks,
      arbitration: {
        option_id: optionId,
        note: "用户裁决已写入计划快照",
      },
    };
    const resolvedEntry: BlackboardEntry = {
      entry_id: "bb_plan_conflict",
      type: "conflict",
      summary: "计划时间冲突已由用户裁决",
      severity: "high",
      evidence_refs: ["plan#day3", `arbitrate#${optionId}`],
      status: "resolved",
      resolution: { action: optionId, note: "用户选择后完成二次审计" },
    };

    return response(
      "arbitrate",
      "ok",
      "裁决已提交，计划重排并通过二次审计",
      { plan: updatedPlan },
      [],
      [resolvedEntry],
    ) as AgentResponse<TIntent>;
  }

  if (intent === "generate_question") {
    return response(
      "generate_question",
      request.demo?.force_verify_fail ? "abstain" : "ok",
      request.demo?.force_verify_fail
        ? "校验失败，暂不展示未经确认的答案"
        : "题目与答案已通过计算检验",
      request.demo?.force_verify_fail
        ? { question: null, verdict: "failed", hint_mode: true }
        : { question: demoQuestion, verdict: "passed", audit_trail: [] },
      [],
      request.demo?.force_verify_fail
        ? [
            {
              entry_id: "bb_verify_challenge",
              type: "challenge",
              summary: "草稿答案依赖未声明的等价替换假设",
              severity: "high",
              evidence_refs: ["question#math_f2_demo_001"],
              status: "open",
            },
          ]
        : [],
    ) as AgentResponse<TIntent>;
  }

  if (intent === "verify_answer") {
    const answer = String(request.input?.answer ?? "").trim();
    const forced = Boolean(request.demo?.force_verify_fail);
    const passed = !forced && ["-4.5", "-9/2"].includes(answer);
    const output: VerifyAnswerOutput = {
      verdict: passed ? "passed" : "failed",
      hint_mode: !passed,
      audit_trail: [
        {
          step: "expand",
          summary: "sin(3x) = 3x - 27x³/6 + O(x⁵)",
        },
        {
          step: "compare",
          summary: "limit((sin(3x) - 3x)/x³) = -9/2",
        },
      ],
    };
    return response(
      "verify_answer",
      passed ? "ok" : "abstain",
      passed
        ? "作答通过计算检验"
        : "校验未通过，已切换为提示模式且不展示错误草稿",
      output,
      [],
      passed
        ? []
        : [
            {
              entry_id: "bb_answer_abstain",
              type: "challenge",
              summary: "答案未通过计算检验，已记录审计轨迹",
              severity: "high",
              evidence_refs: ["question#math_f2_demo_001", "verify#failed"],
              status: "open",
            },
          ],
    ) as AgentResponse<TIntent>;
  }

  if (intent === "proactive_intervention") {
    return response(
      "proactive_intervention",
      "need_user",
      "系统完成巡检，建议降低下一次启动难度",
      {
        card: {
          type: "intervention",
          title: "明天先用一道基础题启动？",
          message: "最近两次任务在进入综合题前中断，建议先完成 6 分钟低门槛任务。",
          options: [
            { id: "accept_intervention", label: "接受建议" },
            { id: "keep_plan", label: "保持原计划" },
          ],
        },
      },
      [
        { id: "accept_intervention", label: "接受建议" },
        { id: "keep_plan", label: "保持原计划" },
      ],
      [
        {
          entry_id: "bb_demo_intervention",
          type: "intervention",
          summary: "连续中断后建议使用低门槛任务恢复节奏",
          severity: "medium",
          evidence_refs: ["trace#recent_attempts", "signal#motivation"],
          status: "open",
        },
      ],
      true,
    ) as AgentResponse<TIntent>;
  }

  if (intent === "challenge" || intent === "metacognitive_feedback") {
    return response(
      intent,
      "need_user",
      "系统发起结构化问题，等待用户选择",
      {
        card: {
          type: intent,
          title: "你希望下一轮如何调整？",
          message: "你注意到同类错误已连续出现 3 次，系统不替你直接修改计划。",
          options: [
            { id: "concept_review", label: "加入概念回顾" },
            { id: "try_another_method", label: "自己尝试另一种方法" },
            { id: "keep_rhythm", label: "保持当前节奏" },
          ],
        },
      },
      [
        { id: "concept_review", label: "加入概念回顾" },
        { id: "try_another_method", label: "自己尝试另一种方法" },
        { id: "keep_rhythm", label: "保持当前节奏" },
      ],
      initialBlackboard.filter((entry) => entry.entry_id === "bb_demo_challenge"),
      true,
    ) as AgentResponse<TIntent>;
  }

  return response(
    intent,
    "ok",
    "主 Agent 已收到任务",
    {},
  ) as AgentResponse<TIntent>;
}

export const mockStoreHelpers = {
  mergeBlackboard,
  conflictOptions,
  demoQuestion: demoQuestion as Question,
  initialBlackboard,
};
