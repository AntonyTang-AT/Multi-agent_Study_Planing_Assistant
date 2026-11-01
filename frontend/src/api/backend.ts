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
  keyword?: string;
}

const filterMockMaterials = (query: MaterialQuery): MaterialCard[] =>
  demoMaterials.filter((material) => {
    const subjectMatch = !query.subject || material.subject === query.subject;
    const chapterMatch =
      !query.chapter || material.chapter_id.includes(query.chapter);
    const tagMatch =
      !query.scenarioTag || material.tags.includes(query.scenarioTag);
    const haystack = [
      material.title,
      material.summary,
      material.chapter_id,
      material.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    const keywordMatch =
      !query.keyword || haystack.includes(query.keyword.toLowerCase());
    return subjectMatch && chapterMatch && tagMatch && keywordMatch;
  });

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
  return response.data;
}

export async function fetchQuestions(
  knowledgeId?: string,
): Promise<Question[]> {
  if (appEnv.useMock) return [demoQuestion];
  const response = await apiClient.get<Question[]>("/api/questions", {
    params: { knowledge_id: knowledgeId },
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

export async function submitAttempt(
  attempt: AttemptRequest,
): Promise<Attempt> {
  if (appEnv.useMock) {
    return {
      attempt_id: `attempt_${Date.now()}`,
      question_id: attempt.question_id,
      user_id: "u_web_demo",
      answer: attempt.answer,
      is_correct: null,
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
