import { useEffect, useRef, useCallback } from "react";

export interface LogEntry {
  type: "log";
  timestamp: string;
  level: string;
  level_name: string;
  message: string;
  logger?: string;
  module?: string;
  function?: string;
  line?: number;
  data?: Record<string, unknown>;
}

interface UseLogStreamOptions {
  onLog?: (log: LogEntry) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useLogStream(options: UseLogStreamOptions = {}) {
  const { onLog, onConnect, onDisconnect, onError } = options;
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    // WebSocket endpoint is at /api/v1/admin/ws/logs
    const wsUrl = `${protocol}//${host}/api/v1/admin/ws/logs?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LogEntry;
        if (data.type === "log") {
          onLog?.(data);
        }
      } catch (e) {
        console.error("Failed to parse log entry:", e);
      }
    };

    ws.onclose = () => {
      onDisconnect?.();
    };

    ws.onerror = (error) => {
      onError?.(error);
    };
  }, [onLog, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Auto-connect on mount (if authenticated)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      connect();
    }
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    send,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}