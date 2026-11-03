import { appEnv } from "../config/env";
import {
  demoMaterials,
  demoQuestion,
  type MaterialCard,
} from "../mocks/mockData";
import type {
  Attempt,
  AttemptRequest,
  BlackboardEntry,
  Material,
  Plan,
  Question,
  ResolveBlackboardRequest,
  SessionResponse,
  Subject,
} from "../types/api";
import { apiClient } from "./client";

export interface MaterialQuery {
  subject?: Subject | "";
  chapter?: string;
  scenarioTag?: string;
  kind?: string;
  keyword?: string;
}

type MaterialLike = {
  subject: Subject;
  chapter_id: string;
  title: string;
  kind: string;
  summary?: string;
  tags?: string[];
};

const matchesMaterialQuery = (material: MaterialLike, query: MaterialQuery) => {
  const subjectMatch = !query.subject || material.subject === query.subject;
  const chapterMatch =
    !query.chapter || material.chapter_id.includes(query.chapter);
  const kindMatch = !query.kind || material.kind === query.kind;
  const tagMatch =
    !query.scenarioTag || (material.tags || []).includes(query.scenarioTag);
  const haystack = [
    material.title,
    material.summary || "",
    material.chapter_id,
    (material.tags || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const keywordMatch =
    !query.keyword || haystack.includes(query.keyword.toLowerCase());
  return subjectMatch && chapterMatch && kindMatch && tagMatch && keywordMatch;
};

const filterMockMaterials = (query: MaterialQuery): MaterialCard[] =>
  demoMaterials.filter((material) => matchesMaterialQuery(material, query));

export async function createSession(): Promise<SessionResponse> {
  if (appEnv.useMock) {
    return { user_id: "u_web_demo" };
  }
  const response = await apiClient.post<SessionResponse>("/api/session");
  return response.data;
}

export async function fetchMaterials(
  query: MaterialQuery = {},
): Promise<Material[]> {
  if (appEnv.useMock) return filterMockMaterials(query);

  const response = await apiClient.get<Material[]>("/api/materials", {
    params: {
      subject: query.subject || undefined,
      chapter: query.chapter || undefined,
      scenario_tag: query.scenarioTag || undefined,
    },
  });
  // 关键词 / 类型在前端二次过滤（后端当前无 keyword/kind 参数）
  return response.data.filter((material) =>
    matchesMaterialQuery(material, {
      kind: query.kind,
      keyword: query.keyword,
      scenarioTag: query.scenarioTag,
    }),
  );
}

export interface QuestionQuery {
  subject?: Subject | "";
  knowledgeId?: string;
  scenarioTag?: string;
  examHot?: boolean;
}

export async function fetchQuestions(
  query: QuestionQuery | string = {},
): Promise<Question[]> {
  const normalized: QuestionQuery =
    typeof query === "string" ? { knowledgeId: query } : query;
  if (appEnv.useMock) {
    return [demoQuestion].filter((item) => {
      if (normalized.subject && item.subject !== normalized.subject) return false;
      if (normalized.examHot != null && item.exam_hot !== normalized.examHot) {
        return false;
      }
      return true;
    });
  }
  const response = await apiClient.get<Question[]>("/api/questions", {
    params: {
      subject: normalized.subject || undefined,
      knowledge_id: normalized.knowledgeId || undefined,
      scenario_tag: normalized.scenarioTag || undefined,
      exam_hot: normalized.examHot,
    },
  });
  return response.data;
}

export async function fetchCurrentPlan(): Promise<Plan | null> {
  if (appEnv.useMock) return null;
  const response = await apiClient.get<Plan | null>("/api/plans/current");
  return response.data;
}

export async function saveCurrentPlan(plan: Plan): Promise<Plan> {
  if (appEnv.useMock) return plan;
  const response = await apiClient.put<Plan>("/api/plans/current", plan);
  return response.data;
}

export async function fetchAttempts(): Promise<Attempt[]> {
  if (appEnv.useMock) return [];
  const response = await apiClient.get<Attempt[]>("/api/attempts");
  return response.data;
}

export async function submitAttempt(
  attempt: AttemptRequest,
): Promise<Attempt> {
  if (appEnv.useMock) {
    return {
      attempt_id: `attempt_${Date.now()}`,
      question_id: attempt.question_id,
      user_id: "u_web_demo",
      answer: attempt.answer,
      is_correct: attempt.is_correct ?? null,
      error_tag: attempt.error_tag ?? null,
      duration_ms: attempt.duration_ms ?? null,
      created_at: new Date().toISOString(),
    };
  }
  const response = await apiClient.post<Attempt>("/api/attempts", attempt);
  return response.data;
}

export async function fetchBlackboard(): Promise<BlackboardEntry[]> {
  if (appEnv.useMock) return [];
  const response =
    await apiClient.get<BlackboardEntry[]>("/api/blackboard");
  return response.data;
}

export async function resolveBlackboardEntry(
  entryId: string,
  resolution: ResolveBlackboardRequest,
): Promise<void> {
  if (appEnv.useMock) return;
  await apiClient.post(`/api/blackboard/${entryId}/resolve`, resolution);
}

export async function postTimeJump(days = 2): Promise<void> {
  if (appEnv.useMock) return;
  await apiClient.post("/api/demo/time-jump", { days });
}
