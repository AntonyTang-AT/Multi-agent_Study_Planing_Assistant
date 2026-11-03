import { apiClient } from "./client";
import type { AuthUser } from "../stores/useAuthStore";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function login(
  username: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", {
    username,
    password,
  });
  return data;
}

export async function register(
  username: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", {
    username,
    password,
    display_name: displayName,
  });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/auth/me");
  return data;
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post("/api/auth/change-password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
}
