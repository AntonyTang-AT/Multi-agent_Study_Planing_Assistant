const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const rawApiBase = import.meta.env.VITE_API_BASE;
// 生产可设 VITE_API_BASE= 空字符串，走同域 /api（勿用 ||，否则会回退到 localhost）
export const appEnv = Object.freeze({
  apiBase:
    rawApiBase === undefined ? "http://localhost:8000" : rawApiBase.trim(),
  useMock: parseBoolean(import.meta.env.VITE_USE_MOCK, true),
});
