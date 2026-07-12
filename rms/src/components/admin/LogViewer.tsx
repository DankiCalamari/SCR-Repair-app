import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "../../lib/utils";
import { Terminal, Pause, Play, Trash2, Download } from "lucide-react";

interface LogEntry {
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

interface LogViewerProps {
  className?: string;
  maxEntries?: number;
}

const LOG_LEVELS = ["debug", "info", "warning", "error"] as const;

export default function LogViewer({ 
  className, 
  maxEntries = 500 
}: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(new Set(LOG_LEVELS));
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(isPaused);

  // Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem("access_token");
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/admin/ws/logs?token=${encodeURIComponent(token)}`;

    setConnectionStatus("Connecting...");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionStatus("Connected");
    };

    ws.onmessage = (event) => {
      if (pausedRef.current) return;
      
      try {
        const data = JSON.parse(event.data) as LogEntry;
        if (data.type === "log") {
          setLogs((prev) => {
            const newLogs = [...prev, data];
            // Keep only the last maxEntries
            if (newLogs.length > maxEntries) {
              return newLogs.slice(-maxEntries);
            }
            return newLogs;
          });
        }
      } catch (e) {
        console.error("Failed to parse log entry:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionStatus("Disconnected");
    };

    ws.onerror = () => {
      setIsConnected(false);
      setConnectionStatus("Error");
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [getToken, maxEntries]);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Toggle pause state
  const togglePause = () => {
    pausedRef.current = !isPaused;
    setIsPaused(!isPaused);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Toggle log level visibility
  const toggleLevel = (level: string) => {
    setVisibleLevels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  // Download logs as JSON
  const downloadLogs = () => {
    const filteredLogs = logs.filter((log) => visibleLevels.has(log.level));
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Level styling
  const getLevelStyles = (level: string) => {
    switch (level) {
      case "debug":
        return "text-rms-text0";
      case "info":
        return "text-blue-400";
      case "warning":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      default:
        return "text-rms-text-secondary";
    }
  };

  const filteredLogs = logs.filter((log) => visibleLevels.has(log.level));

  return (
    <div className={cn("flex flex-col rounded-lg border border-rms-border bg-rms-surface", className)}>
      {/* Header */}
      <div className="border-b border-rms-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-brand-500" />
          <h3 className="font-heading text-sm font-semibold text-rms-text">
            Real-time Logs
          </h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            isConnected 
              ? "bg-green-500/20 text-green-400" 
              : "bg-rms-raised text-rms-text-secondary"
          )}>
            {connectionStatus}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Level filters */}
          <div className="flex items-center gap-1 mr-2">
            {LOG_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded capitalize",
                  visibleLevels.has(level)
                    ? cn(getLevelStyles(level), "bg-rms-raised")
                    : "text-rms-text-secondary bg-transparent"
                )}
              >
                {level}
              </button>
            ))}
          </div>
          
          <button
            onClick={togglePause}
            className="p-1 rounded hover:bg-rms-raised transition-colors"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="h-3.5 w-3.5 text-rms-text-secondary" />
            ) : (
              <Pause className="h-3.5 w-3.5 text-rms-text-secondary" />
            )}
          </button>
          
          <button
            onClick={downloadLogs}
            className="p-1 rounded hover:bg-rms-raised transition-colors"
            title="Download logs"
          >
            <Download className="h-3.5 w-3.5 text-rms-text-secondary" />
          </button>
          
          <button
            onClick={clearLogs}
            className="p-1 rounded hover:bg-rms-raised transition-colors"
            title="Clear logs"
          >
            <Trash2 className="h-3.5 w-3.5 text-rms-text-secondary" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto max-h-96 p-2 font-mono text-xs"
      >
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-rms-text0">
            No logs to display
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, idx) => (
              <div
                key={idx}
                className="border-l-2 border-rms-border pl-2 py-0.5 hover:bg-rms-raised/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-rms-text-secondary whitespace-nowrap">
                    {log.timestamp?.split("T")[1]?.split(".")[0] || "—"}
                  </span>
                  <span className={cn("font-medium whitespace-nowrap", getLevelStyles(log.level))}>
                    {log.level_name}
                  </span>
                  <span className="text-rms-text0 truncate min-w-0 flex-1">
                    {log.logger && <span className="text-rms-text-secondary">{log.logger} — </span>}
                    <span className="text-rms-text-secondary">{log.message}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}