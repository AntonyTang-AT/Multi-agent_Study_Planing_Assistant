import axios, { AxiosError } from "axios";
import { message } from "antd";

import { appEnv } from "../config/env";
import type { ApiErrorResponse } from "../types/api";

export const apiClient = axios.create({
  baseURL: appEnv.apiBase,
  timeout: 12_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers.set("X-Request-Source", "zhixu-frontend");
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const payload = error.response?.data;
    const fallback =
      error.code === "ECONNABORTED"
        ? "请求超时，请检查后端服务后重试"
        : "服务暂时不可用，请稍后重试";
    const text = payload?.message || error.message || fallback;

    message.error(text);
    return Promise.reject(error);
  },
);

export const isMockMode = () => appEnv.useMock;
