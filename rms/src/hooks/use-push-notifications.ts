import { useState, useEffect, useCallback } from "react";
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from "@/api/push";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission denied");
        setIsLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key
      const { public_key } = await getVapidPublicKey();

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });

      // Send to backend
      const subJSON = subscription.toJSON();
      await subscribeToPush({
        endpoint: subJSON.endpoint!,
        p256dh: subJSON.keys!.p256dh,
        auth: subJSON.keys!.auth,
      });

      setIsSubscribed(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to subscribe";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const subJSON = subscription.toJSON();
        await unsubscribeFromPush({
          endpoint: subJSON.endpoint!,
          p256dh: subJSON.keys!.p256dh,
          auth: subJSON.keys!.auth,
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const toggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    toggle,
  };
}
