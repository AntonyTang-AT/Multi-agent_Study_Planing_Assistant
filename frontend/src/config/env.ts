const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

export const appEnv = Object.freeze({
  apiBase: import.meta.env.VITE_API_BASE?.trim() || "http://localhost:8000",
  useMock: parseBoolean(import.meta.env.VITE_USE_MOCK, true),
});
