import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { useAuthStore } from "./store/auth-store";
import * as authApi from "./api/auth";
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

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename="/app">
          <QueryClientProvider client={queryClient}>
            <App />
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