import axios, { type InternalAxiosRequestConfig } from "axios";

const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT access token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401, then retry original request
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop — don't retry the refresh endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");

      if (refresh) {
        try {
          const { data } = await axios.post("/api/v1/auth/refresh/", { refresh });
          localStorage.setItem("access_token", data.access);
          // Save the rotated refresh token — backend blacklists the old one immediately
          if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return apiClient(originalRequest);
        } catch {
          // Refresh failed — clear both localStorage and Zustand state
          const { useAuthStore } = await import("@/features/auth/store/authStore");
          useAuthStore.getState().logout();
          window.location.replace("/login");
        }
      } else {
        // No refresh token — log out immediately
        const { useAuthStore } = await import("@/features/auth/store/authStore");
        useAuthStore.getState().logout();
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
