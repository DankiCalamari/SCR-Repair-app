import client from "./client";
import type { PaginatedResponse, EmailMessage, SmsMessage, Lead } from "../types";

export interface UnassignedCommunication {
  id: string;
  type: "email" | "sms" | "lead";
  from: string;
  to: string;
  subject?: string;
  body: string;
  status: string;
  created_at: string;
  repair_id?: string | null;
  customer_id?: string | null;
  phone?: string;
  email?: string;
  device_type?: string;
  device_model?: string;
  preferred_contact_method?: string;
}

export interface Conversation {
  id: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  last_message_at: string;
  last_message_body: string;
  last_message_type: "email" | "sms";
  last_message_direction: "inbound" | "outbound";
  unread_count: number;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  type: "email" | "sms";
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  subject?: string;
  body: string;
  status: string;
  created_at: string;
}

export async function listUnassignedCommunications(
  skip = 0,
  limit = 50,
): Promise<{ data: UnassignedCommunication[]; total: number }> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
    unassigned: "true",
  });

  const [emailRes, smsRes, leadsRes] = await Promise.all([
    client.get(`/email/?${params.toString()}`).then((r) => r.data as PaginatedResponse<EmailMessage>),
    client.get(`/sms/?${params.toString()}`).then((r) => r.data as PaginatedResponse<SmsMessage>),
    client.get(`/leads/?${params.toString()}&status=new`).then((r) => r.data as PaginatedResponse<Lead>),
  ]);

  const emails: UnassignedCommunication[] = emailRes.data.map((e) => ({
    id: e.id,
    type: "email",
    from: e.from_address,
    to: e.to_address,
    subject: e.subject,
    body: e.body,
    status: e.status,
    created_at: e.created_at,
    repair_id: e.repair_id,
    customer_id: e.customer_id,
  }));

  const sms: UnassignedCommunication[] = smsRes.data.map((s) => ({
    id: s.id,
    type: "sms",
    from: s.from_number,
    to: s.to_number,
    body: s.body,
    status: s.status,
    created_at: s.created_at,
    repair_id: s.repair_id,
    customer_id: s.customer_id,
  }));

  const leads: UnassignedCommunication[] = leadsRes.data.map((l) => ({
    id: l.id,
    type: "lead",
    from: l.name,
    to: l.email || l.phone,
    subject: l.issue_description ? `Enquiry: ${l.issue_description.substring(0, 60)}` : "Contact form submission",
    body: [
      l.issue_description,
      l.device_type ? `Device: ${l.device_type} ${l.device_model || ""}` : null,
      `Preferred contact: ${l.preferred_contact_method}`,
    ].filter(Boolean).join("\n"),
    status: l.status,
    created_at: l.created_at,
    phone: l.phone,
    email: l.email || undefined,
    device_type: l.device_type || undefined,
    device_model: l.device_model || undefined,
    preferred_contact_method: l.preferred_contact_method,
  }));

  const combined = [...emails, ...sms, ...leads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    data: combined,
    total: emailRes.total + smsRes.total + leadsRes.total,
  };
}

export async function listAllConversations(
  skip = 0,
  limit = 50,
): Promise<{ data: Conversation[]; total: number }> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const [emailRes, smsRes] = await Promise.all([
    client.get(`/email/?${params.toString()}`).then((r) => r.data as PaginatedResponse<EmailMessage>),
    client.get(`/sms/?${params.toString()}`).then((r) => r.data as PaginatedResponse<SmsMessage>),
  ]);

  const contactMap = new Map<string, {
    contact_name: string;
    contact_email?: string;
    contact_phone?: string;
    messages: ConversationMessage[];
    last_message_at: string;
    last_message_body: string;
    last_message_type: "email" | "sms";
    last_message_direction: "inbound" | "outbound";
    inboundCount: number;
  }>();

  for (const e of emailRes.data) {
    const key = e.from_address.toLowerCase();
    const existing = contactMap.get(key);
    const msg: ConversationMessage = {
      id: e.id,
      type: "email",
      direction: e.direction as "inbound" | "outbound",
      from: e.from_address,
      to: e.to_address,
      subject: e.subject,
      body: e.body,
      status: e.status,
      created_at: e.created_at,
    };
    if (existing) {
      existing.messages.push(msg);
      if (e.direction === "inbound") existing.inboundCount++;
      if (new Date(e.created_at) > new Date(existing.last_message_at)) {
        existing.last_message_at = e.created_at;
        existing.last_message_body = e.body;
        existing.last_message_type = "email";
        existing.last_message_direction = e.direction as "inbound" | "outbound";
      }
    } else {
      contactMap.set(key, {
        contact_name: e.from_address,
        contact_email: e.from_address,
        messages: [msg],
        last_message_at: e.created_at,
        last_message_body: e.body,
        last_message_type: "email",
        last_message_direction: e.direction as "inbound" | "outbound",
        inboundCount: e.direction === "inbound" ? 1 : 0,
      });
    }
  }

  for (const s of smsRes.data) {
    const isInbound = (s.direction as string) === "inbound";
    const key = isInbound ? s.from_number : s.to_number;
    const existing = contactMap.get(key);
    const msg: ConversationMessage = {
      id: s.id,
      type: "sms",
      direction: s.direction as "inbound" | "outbound",
      from: s.from_number,
      to: s.to_number,
      body: s.body,
      status: s.status,
      created_at: s.created_at,
    };
    if (existing) {
      existing.messages.push(msg);
      if (isInbound) existing.inboundCount++;
      if (new Date(s.created_at) > new Date(existing.last_message_at)) {
        existing.last_message_at = s.created_at;
        existing.last_message_body = s.body;
        existing.last_message_type = "sms";
        existing.last_message_direction = s.direction as "inbound" | "outbound";
      }
      if (!existing.contact_phone) existing.contact_phone = key;
    } else {
      contactMap.set(key, {
        contact_name: key,
        contact_phone: key,
        messages: [msg],
        last_message_at: s.created_at,
        last_message_body: s.body,
        last_message_type: "sms",
        last_message_direction: s.direction as "inbound" | "outbound",
        inboundCount: isInbound ? 1 : 0,
      });
    }
  }

  const conversations: Conversation[] = Array.from(contactMap.values())
    .map((c) => ({
      id: c.contact_email || c.contact_phone || "",
      contact_name: c.contact_name,
      contact_email: c.contact_email,
      contact_phone: c.contact_phone,
      last_message_at: c.last_message_at,
      last_message_body: c.last_message_body,
      last_message_type: c.last_message_type,
      last_message_direction: c.last_message_direction,
      unread_count: c.inboundCount,
      messages: c.messages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }))
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  return {
    data: conversations,
    total: conversations.length,
  };
}

export async function getConversationMessages(
  type: "email" | "sms",
  contact: string,
  skip = 0,
  limit = 50,
): Promise<{ data: ConversationMessage[]; total: number }> {
  const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });

  if (type === "email") {
    params.append("customer_id", contact);
  }

  const { data } = await client.get(`/${type === "email" ? "email" : "sms"}/?${params.toString()}`);
  const messages: ConversationMessage[] = (data as PaginatedResponse<EmailMessage | SmsMessage>).data.map(
    (m) => ({
      id: m.id,
      type,
      direction: (m as EmailMessage).direction || (m as SmsMessage).direction,
      from: (m as EmailMessage).from_address || (m as SmsMessage).from_number,
      to: (m as EmailMessage).to_address || (m as SmsMessage).to_number,
      subject: (m as EmailMessage).subject,
      body: m.body,
      status: m.status,
      created_at: m.created_at,
    }),
  );

  return { data: messages, total: (data as PaginatedResponse<unknown>).total };
}

export async function assignEmail(emailId: string, repairId: string): Promise<EmailMessage> {
  const { data } = await client.post(`/email/${emailId}/assign?repair_id=${repairId}`);
  return data;
}

export async function assignSms(smsId: string, repairId: string): Promise<SmsMessage> {
  const { data } = await client.post(`/sms/${smsId}/assign?repair_id=${repairId}`);
  return data;
}

export async function convertLead(leadId: string): Promise<unknown> {
  const { data } = await client.post(`/leads/${leadId}/convert`);
  return data;
}

export async function updateLeadStatus(leadId: string, status: string): Promise<unknown> {
  const { data } = await client.put(`/leads/${leadId}`, { status });
  return data;
}
