import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, UserRole } from "@/shared/types/auth";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;

  // Role helpers
  isAdmin: () => boolean;
  canAccess: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);
        set({ user, isAuthenticated: true });
      },

      setAccessToken: (token) => {
        localStorage.setItem("access_token", token);
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, isAuthenticated: false });
      },

      isAdmin: () => get().user?.role === "admin" || get().user?.role === "super_admin",

      canAccess: (roles) => {
        const role = get().user?.role;
        if (!role) return false;
        if (role === "super_admin" || role === "admin") return true;
        return roles.includes(role);
      },
    }),
    {
      name: "medidesk-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Re-export types for convenience
export type { AuthUser, UserRole };
