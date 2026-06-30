import apiClient from "./client";
import type { DashboardStats, RecentActivity } from "../types";

export async function getDashboardWidgets(): Promise<{ widgets: string[] }> {
  const { data } = await apiClient.get("/dashboard/widgets");
  return data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get("/dashboard/stats");
  return data;
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
  const { data } = await apiClient.get("/dashboard/recent-activity");
  return data;
}
