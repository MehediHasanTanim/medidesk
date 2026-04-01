import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    host: true, // bind to 0.0.0.0 so Docker exposes the port
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL ?? "http://localhost:8005",
        changeOrigin: true,
      },
    },
  },
});
