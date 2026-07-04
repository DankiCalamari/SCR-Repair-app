import apiClient from "./client";
import type {
  Customer,
  CustomerWithRepairs,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  Repair,
  Device,
  PaginatedResponse,
} from "../types";

export async function listCustomers(
  skip?: number,
  limit?: number,
  search?: string,
): Promise<PaginatedResponse<Customer>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (search !== undefined) params.search = search;
  const { data } = await apiClient.get("/customers", { params });
  return data;
}

export async function getCustomer(id: string): Promise<CustomerWithRepairs> {
  const { data } = await apiClient.get(`/customers/${id}`);
  return data;
}

export async function createCustomer(customerData: CreateCustomerRequest): Promise<Customer> {
  const { data } = await apiClient.post("/customers", customerData);
  return data;
}

export async function updateCustomer(id: string, customerData: UpdateCustomerRequest): Promise<Customer> {
  const { data } = await apiClient.put(`/customers/${id}`, customerData);
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}

export async function getCustomerRepairs(id: string): Promise<Repair[]> {
  const { data } = await apiClient.get(`/customers/${id}/repairs`);
  return data;
}

export async function getCustomerTimeline(id: string): Promise<PaginatedResponse<unknown>> {
  const { data } = await apiClient.get(`/customers/${id}/timeline`);
  return data;
}

export async function getCustomerDevices(id: string): Promise<Device[]> {
  const { data } = await apiClient.get(`/customers/${id}/devices`);
  return data;
}
