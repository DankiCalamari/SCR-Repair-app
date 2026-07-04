import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import SetupPage from "./pages/auth/SetupPage";
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
class ErrorBoundary extends React.Component {
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

function RouterInitializer() {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    // Initialize auth if token exists
    if (token) {
      authApi.getMe()
        .then((user) => {
          setUser(user);
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          useAuthStore.setState({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isAdmin: false,
            isStaff: false,
            isCustomer: false,
          });
        });
    }

    // Check setup status
    authApi.checkSetupStatus()
      .then((status) => {
        setNeedsSetup(status.needs_setup);
      })
      .catch((e: unknown) => {
        console.error("Setup status check failed:", e);
        setNeedsSetup(false);
      })
      .finally(() => setChecking(false));
  }, [setUser]);

  if (checking) {
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

  // If setup is needed, render a minimal router just for setup page
  if (needsSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  // Otherwise render the full app
  return <App />;
}

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename="/app">
          <QueryClientProvider client={queryClient}>
            <RouterInitializer />
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
