import client from "./client";

export interface SmsMessage {
  id: string;
  repair_id?: string;
  customer_id?: string;
  direction: "outbound" | "inbound";
  status: "pending" | "sent" | "delivered" | "failed";
  from_number: string;
  to_number: string;
  body: string;
  external_id?: string;
  sim_number?: number;
  error_message?: string;
  delivered_at?: string;
  created_at: string;
}

export interface SmsSendRequest {
  to_number: string;
  body: string;
  repair_id?: string;
  customer_id?: string;
  sim_number?: number;
}

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
}

export interface SmsTemplateSendRequest {
  template_id: string;
  repair_id?: string;
  customer_id?: string;
  sim_number?: number;
}

export interface SmsGatewaySettings {
  id?: string;
  gateway_url: string;
  username: string;
  password?: string;
  device_id?: string;
  is_active: boolean;
  webhook_secret?: string;
  webhook_url?: string;
}

export interface SmsGatewayStatus {
  connected: boolean;
  status?: string;
  battery_level?: number;
  is_charging?: boolean;
  last_seen?: string;
  sim_cards: Array<{
    number: number;
    operator: string;
    status: string;
  }>;
  message?: string;
}

export const listSmsMessages = async (
  skip = 0,
  limit = 50,
  repairId?: string,
  customerId?: string,
  direction?: string,
  unassigned?: boolean
) => {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  if (repairId) params.append("repair_id", repairId);
  if (customerId) params.append("customer_id", customerId);
  if (direction) params.append("direction", direction);
  if (unassigned) params.append("unassigned", "true");

  const { data } = await client.get(`/sms/?${params.toString()}`);
  return data;
};

export const assignSmsToRepair = async (smsId: string, repairId: string) => {
  const { data } = await client.post(`/sms/${smsId}/assign?repair_id=${repairId}`);
  return data;
};

export const sendSms = async (data: SmsSendRequest) => {
  const { data: response } = await client.post("/sms/send", data);
  return response;
};

export const sendSmsTemplate = async (data: SmsTemplateSendRequest) => {
  const { data: response } = await client.post("/sms/send-template", data);
  return response;
};

export const getSmsSettings = async (): Promise<SmsGatewaySettings> => {
  const { data } = await client.get("/sms/settings");
  return data;
};

export const updateSmsSettings = async (data: SmsGatewaySettings): Promise<SmsGatewaySettings> => {
  const { data: response } = await client.put("/sms/settings", data);
  return response;
};

export const getGatewayStatus = async (): Promise<SmsGatewayStatus> => {
  const { data } = await client.get("/sms/gateway-status");
  return data;
};

export const testGateway = async () => {
  const { data } = await client.post("/sms/test");
  return data;
};

export const getSmsTemplates = async (): Promise<SmsTemplate[]> => {
  const { data } = await client.get("/sms/templates");
  return data;
};
