import apiClient from "./client";
import type { AuthResponse, User } from "../types";

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
}

export async function register(email: string, password: string, fullName: string, phone: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/register", {
    email, password, full_name: fullName, phone,
  });
  return data;
}

export async function refreshToken(refreshToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/refresh", { refresh_token: refreshToken });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
