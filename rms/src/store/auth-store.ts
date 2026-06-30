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
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isAdmin: false, isStaff: false, isCustomer: false });
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: true,
      isAdmin: user.role === "admin",
      isStaff: user.role === "admin" || user.role === "staff",
      isCustomer: user.role === "customer",
    });
  },
}));
