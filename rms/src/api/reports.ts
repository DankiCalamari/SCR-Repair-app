import apiClient from "./client";

export async function getReport(period: string = "month"): Promise<{
  period: string;
  total_repairs: number;
  completed_repairs: number;
  total_revenue: number;
  average_turnaround: number;
  popular_devices: Array<{ device: string; count: number }>;
}> {
  const { data } = await apiClient.get(`/reports?period=${period}`);
  return data;
}

export async function downloadReport(period: string = "month", format: string = "pdf"): Promise<{
  message: string;
  download_url: string;
}> {
  const { data } = await apiClient.get(`/reports/download?period=${period}&format=${format}`);
  return data;
}