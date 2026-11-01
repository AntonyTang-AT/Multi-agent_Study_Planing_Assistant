import axios from "axios";

import { appEnv } from "../config/env";
import { invokeMockAgent } from "../mocks/mockAgent";
import type {
  AgentDemoFlags,
  AgentIntent,
  AgentRequest,
  AgentResponse,
} from "../types/api";
import { apiClient } from "./client";

type AgentPayload = Omit<
  Partial<AgentRequest>,
  "request_id" | "task_id" | "intent"
> & {
  demo?: AgentDemoFlags;
};

const requestId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `request_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export async function invokeAgent<TIntent extends AgentIntent>(
  intent: TIntent,
  payload: AgentPayload = {},
): Promise<AgentResponse<TIntent>> {
  const request: AgentRequest = {
    request_id: requestId(),
    task_id: requestId(),
    intent,
    scenario: "final_review",
    user_profile: {
      user_id: "u_web_demo",
      constraints: {
        hard: [],
        soft: [],
      },
    },
    input: {},
    resource_refs: [],
    resource_payload: {},
    trace_snapshot: {},
    demo: {},
    ...payload,
  };

  if (appEnv.useMock) {
    return invokeMockAgent(intent, request);
  }

  const response = await apiClient.post<AgentResponse<TIntent>>(
    `/api/ai/${intent}`,
    request,
  );
  return response.data;
}

export function agentErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data as
      | { code?: string; message?: string }
      | undefined;
    if (detail?.code === "agent_unavailable") {
      return "智能服务暂不可用，学习资料、计划与作答记录仍可正常使用。";
    }
    return detail?.message || error.message;
  }
  return error instanceof Error ? error.message : "未知服务错误";
}
