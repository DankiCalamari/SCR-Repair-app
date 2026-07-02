import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate } from "react-router-dom";
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

function SplashScreen() {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          await authApi.getMe();
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
      setChecking(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!checking && !isAuthenticated) {
      authApi.checkSetupStatus()
        .then((status) => setNeedsSetup(status.needs_setup))
        .catch(() => setNeedsSetup(false));
    }
  }, [checking, isAuthenticated]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-copper-500 border-t-transparent" />
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }
  return <Navigate to="/login" replace />;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
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
        })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [setUser]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-copper-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/app/static/sw.js").catch(() => {
      // Service worker registration failed — app still works without it
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          <SplashScreen />
          <App />
        </AuthInitializer>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
