import { create } from "zustand";
import type { User } from "../types";
import * as authApi from "../api/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  isAuthenticated: !!localStorage.getItem("access_token"),
  isAdmin: false,
  isStaff: false,
  isCustomer: false,

  login: async (email, password) => {
    const response = await authApi.login(email, password);
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("refresh_token", response.refresh_token);
    const user = await authApi.getMe();
    localStorage.setItem("user_data", JSON.stringify(user));
    set({
      user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      isAuthenticated: true,
      isAdmin: user.role === "admin",
      isStaff: user.role === "admin" || user.role === "staff",
      isCustomer: user.role === "customer",
    });
  },

  register: async (email, password, fullName, phone) => {
    const response = await authApi.register(email, password, fullName, phone);
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("refresh_token", response.refresh_token);
    const user = await authApi.getMe();
    localStorage.setItem("user_data", JSON.stringify(user));
    set({
      user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      isAuthenticated: true,
      isAdmin: user.role === "admin",
      isStaff: user.role === "admin" || user.role === "staff",
      isCustomer: user.role === "customer",
    });
  },

  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isAdmin: false, isStaff: false, isCustomer: false });
  },

  setUser: (user) => {
    localStorage.setItem("user_data", JSON.stringify(user));
    set({
      user,
      isAuthenticated: true,
      isAdmin: user.role === "admin",
      isStaff: user.role === "admin" || user.role === "staff",
      isCustomer: user.role === "customer",
    });
  },

  restoreSession: async () => {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    const storedUser = localStorage.getItem("user_data");

    // If we have a stored user, restore it immediately
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isAdmin: user.role === "admin",
          isStaff: user.role === "admin" || user.role === "staff",
          isCustomer: user.role === "customer",
        });
      } catch {
        localStorage.removeItem("user_data");
      }
    }

    // If we have an access token, verify it and refresh if needed
    if (accessToken) {
      try {
        // Try to get user info with current token
        const user = await authApi.getMe();
        localStorage.setItem("user_data", JSON.stringify(user));
        set({
          user,
          isAuthenticated: true,
          isAdmin: user.role === "admin",
          isStaff: user.role === "admin" || user.role === "staff",
          isCustomer: user.role === "customer",
        });
        return true;
      } catch (error) {
        // Access token might be expired, try refresh
        if (refreshToken) {
          try {
            const response = await authApi.refreshToken(refreshToken);
            localStorage.setItem("access_token", response.access_token);
            localStorage.setItem("refresh_token", response.refresh_token);
            const user = await authApi.getMe();
            localStorage.setItem("user_data", JSON.stringify(user));
            set({
              user,
              accessToken: response.access_token,
              refreshToken: response.refresh_token,
              isAuthenticated: true,
              isAdmin: user.role === "admin",
              isStaff: user.role === "admin" || user.role === "staff",
              isCustomer: user.role === "customer",
            });
            return true;
          } catch {
            // Refresh failed, clear everything
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_data");
            set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isAdmin: false, isStaff: false, isCustomer: false });
          }
        }
      }
    }
    return false;
  },
}));
