/**
 * API contracts mirrored from docs/api.md and docs/agent-api.md.
 *
 * The frontend talks only to the backend gateway. AgentResponse is the shape
 * returned by POST /api/ai/{intent}; it must not be confused with a direct
 * connection to the Agent service.
 */

export type Scenario = "final_review" | "catch_up";
export type Subject = "math" | "physics";

export type AgentIntent =
  | "create_plan"
  | "arbitrate"
  | "generate_question"
  | "verify_answer"
  | "record_trace"
  | "challenge"
  | "metacognitive_feedback"
  | "proactive_intervention"
  | "echo";

export type AgentStatus =
  | "ok"
  | "conflict"
  | "doubt"
  | "failed"
  | "abstain"
  | "need_user";

export type BlackboardType =
  | "conflict"
  | "challenge"
  | "intervention"
  | "hypothesis"
  | "stage_conclusion";

export type BlackboardStatus = "open" | "resolved" | "rejected" | "deferred";
export type Severity = "high" | "medium" | "low";

export interface ApiErrorResponse {
  code?: string;
  message: string;
  detail?: unknown;
}

export interface HealthResponse {
  db: "up" | "down";
  agent: "up" | "down";
}

export interface SessionResponse {
  user_id: string;
}

export interface Material {
  material_id: string;
  subject: Subject;
  chapter_id: string;
  kind: "textbook" | "courseware" | "homework" | "answer_book" | "textbook_reference";
  title: string;
  file?: string;
  page_range?: [number, number] | null;
  page_status?: string;
  license_note: string;
  status: string;
  note?: string | null;
}

export interface VerifyHint {
  expr: string;
  expected: string;
}

export interface Question {
  question_id: string;
  subject: Subject;
  knowledge_ids: string[];
  scenario_tags: Scenario[];
  chapter: string;
  exam_hot: boolean;
  difficulty: number;
  type: "fill" | "choice" | "calc" | "proof";
  stem: string;
  answer: string;
  assumptions: string[];
  error_tags: string[];
  verify_hint?: VerifyHint | null;
  source: string;
  license_note: string;
}

export type LoadLevel = "low" | "medium" | "high";

export interface PlanTask {
  day: number;
  action: string;
  object: string;
  minutes: number;
  completion_criteria: string;
  load: LoadLevel;
  knowledge_ids: string[];
  subject: Subject;
  error_tag?: string;
}

export interface Plan {
  scenario?: Scenario;
  goal: string;
  daily_minutes_budget: number;
  days_left: number;
  tasks: PlanTask[];
  arbitration?: {
    option_id: string;
    note?: string;
  };
}

export interface BlackboardEntry {
  entry_id: string;
  type: BlackboardType | string;
  summary: string;
  severity: Severity | string;
  evidence_refs: string[];
  status: BlackboardStatus | string;
  resolution?: {
    action: string;
    note?: string;
  };
}

export interface UserOption {
  id: string;
  label: string;
}

export interface AuditTrailItem {
  step?: string;
  summary?: string;
  evidence_refs?: string[];
  [key: string]: unknown;
}

export interface CreatePlanOutput {
  plan?: Plan;
  audit_issues?: Array<Record<string, unknown>>;
  error_strategy?: Record<string, unknown>;
}

export interface VerifyAnswerOutput {
  verdict?: "passed" | "doubt" | "failed";
  hint_mode?: boolean;
  audit_trail?: AuditTrailItem[];
  diff?: unknown;
}

export interface AgentCard {
  type?: string;
  title?: string;
  message?: string;
  options?: UserOption[];
  [key: string]: unknown;
}

export interface AgentOutputMap {
  create_plan: CreatePlanOutput;
  arbitrate: CreatePlanOutput;
  generate_question: {
    question?: Question | null;
    verdict?: string;
    audit_trail?: AuditTrailItem[];
    hint_mode?: boolean;
  };
  verify_answer: VerifyAnswerOutput;
  record_trace: Record<string, unknown>;
  challenge: { card?: AgentCard };
  metacognitive_feedback: { card?: AgentCard };
  proactive_intervention: { card?: AgentCard };
  echo: Record<string, unknown>;
}

export interface AgentMeta {
  agent_version: string;
  latency_ms: number;
}

export interface AgentResponse<TIntent extends AgentIntent = AgentIntent> {
  request_id: string;
  task_id: string;
  status: AgentStatus;
  message: string;
  output: AgentOutputMap[TIntent];
  blackboard_entries: BlackboardEntry[];
  user_options: UserOption[];
  evidence_refs: string[];
  requires_approval: boolean;
  meta: AgentMeta;
}

export interface AgentDemoFlags {
  force_conflict?: boolean;
  force_verify_fail?: boolean;
  time_jump_days?: number;
}

export interface AgentRequest<TInput extends Record<string, unknown> = Record<string, unknown>> {
  request_id: string;
  task_id: string;
  scenario?: Scenario;
  intent: AgentIntent;
  user_profile?: {
    user_id: string;
    constraints?: {
      hard: string[];
      soft: string[];
    };
  };
  input?: TInput;
  resource_refs?: Array<{
    type: string;
    id: string;
    label?: string;
  }>;
  resource_payload?: Record<string, unknown>;
  trace_snapshot?: Record<string, unknown>;
  demo?: AgentDemoFlags;
}

export interface AttemptRequest {
  question_id: string;
  answer: string;
  error_tag?: string;
  duration_ms?: number;
}

export interface Attempt {
  attempt_id: string;
  question_id: string;
  user_id: string;
  answer: string;
  is_correct?: boolean | null;
  error_tag?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface ResolveBlackboardRequest {
  action: string;
  note?: string;
}

export interface DemoTimeJumpRequest {
  days: number;
}
