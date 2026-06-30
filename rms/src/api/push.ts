import apiClient from "./client";

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function getVapidPublicKey(): Promise<{ public_key: string }> {
  const { data } = await apiClient.get("/push/vapid-key");
  return data;
}

export async function subscribeToPush(
  subscription: PushSubscriptionPayload,
): Promise<{ id: string; endpoint: string; created_at: string }> {
  const { data } = await apiClient.post("/push/subscribe", subscription);
  return data;
}

export async function unsubscribeFromPush(
  subscription: PushSubscriptionPayload,
): Promise<void> {
  await apiClient.post("/push/unsubscribe", subscription);
}

export async function listMySubscriptions(): Promise<
  { id: string; endpoint: string; created_at: string }[]
> {
  const { data } = await apiClient.get("/push/my-subscriptions");
  return data;
}
