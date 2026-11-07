import axios, { AxiosError } from "axios";
import { message } from "antd";

import { appEnv } from "../config/env";
import { useAuthStore } from "../stores/useAuthStore";
import type { ApiErrorResponse } from "../types/api";

export const apiClient = axios.create({
  baseURL: appEnv.apiBase,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers.set("X-Request-Source", "zhixu-frontend");
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    if (status === 401) {
      const hadToken = Boolean(useAuthStore.getState().token);
      useAuthStore.getState().clearAuth();
      if (
        hadToken &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        const next = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        window.location.assign(`/login?next=${next}`);
      }
    }

    // blob 响应的 data 不是 JSON，不能直接读 .message，否则会弹出无意义/卡顿提示
    if (error.config?.responseType === "blob") {
      return Promise.reject(error);
    }

    const payload = error.response?.data;
    const fallback =
      error.code === "ECONNABORTED"
        ? "请求超时，请检查后端服务后重试"
        : "服务暂时不可用，请稍后重试";
    const text = payload?.message || error.message || fallback;

    // login page handles its own errors; avoid double toast on 401 redirect
    if (!(status === 401 && window.location.pathname.startsWith("/login"))) {
      message.error(text);
    }
    return Promise.reject(error);
  },
);

export const isMockMode = () => appEnv.useMock;
