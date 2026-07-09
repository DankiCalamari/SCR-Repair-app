import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { useAuthStore } from "./store/auth-store";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Simple error boundary for debugging
class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { hasError: false, error: null as Error | null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", backgroundColor: "#fee", minHeight: "100vh" }}>
          <h1 style={{ color: "red" }}>Something went wrong</h1>
          <pre style={{ color: "red" }}>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Session restoration wrapper
function SessionRestorer({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    // Only restore if we have tokens in localStorage
    const token = localStorage.getItem("access_token");
    if (token) {
      restoreSession().finally(() => setRestoring(false));
    } else {
      setRestoring(false);
    }
  }, [restoreSession]);

  if (restoring) {
    return (
      <div style={{ 
        display: "flex", 
        minHeight: "100vh", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#fefaf6"
      }}>
        <div style={{ 
          width: "2rem", 
          height: "2rem", 
          border: "4px solid #e06645",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename="/app">
          <QueryClientProvider client={queryClient}>
            <SessionRestorer>
              <App />
            </SessionRestorer>
          </QueryClientProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e) {
  console.error("Failed to render app:", e);
  document.getElementById("root")!.innerHTML = 
    "<div style='padding:20px;background:#fee;color:red;min-height:100vh'>" +
    "<h1>Render Error</h1><pre>" + (e as Error).message + "</pre></div>";
}