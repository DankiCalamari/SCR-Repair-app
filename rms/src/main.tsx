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

function RouterInitializer() {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setHasToken(!!token);

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
      .catch(() => setNeedsSetup(false))
      .finally(() => setChecking(false));
  }, [setUser]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-copper-500 border-t-transparent" />
      </div>
    );
  }

  // When setup is needed and no token, redirect to setup
  if (needsSetup && !hasToken) {
    return <Navigate to="/setup" replace />;
  }

  // Otherwise render the app normally (which has its own routing)
  return <App />;
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
        <RouterInitializer />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
