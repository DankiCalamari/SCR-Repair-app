import apiClient from "./client";
import type { AuthResponse, User } from "../types";
import { API_BASE_URL } from "../lib/constants";

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

export async function checkSetupStatus(): Promise<{ needs_setup: boolean; admin_exists: boolean }> {
  const response = await fetch(`${API_BASE_URL}/public/setup-status`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error("Failed to check setup status");
  }
  return response.json();
}
