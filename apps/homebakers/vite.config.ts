import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.APP_PORT ?? 5173),
    proxy: {
      "/api": `http://127.0.0.1:${process.env.API_PORT ?? 3002}`,
      "/mcp": `http://127.0.0.1:${process.env.API_PORT ?? 3002}`,
      "/oauth": `http://127.0.0.1:${process.env.API_PORT ?? 3002}`,
      "/.well-known": `http://127.0.0.1:${process.env.API_PORT ?? 3002}`,
    },
  },
});
