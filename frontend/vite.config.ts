import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Ant Design and its RC primitives form one vendor graph. Keeping them
    // together avoids circular chunks while page routes stay independently lazy.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replaceAll("\\", "/");
          if (!normalized.includes("/node_modules/")) return undefined;
          if (
            /\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
              normalized,
            )
          ) {
            return "react-vendor";
          }
          if (
            normalized.includes("/node_modules/antd/") ||
            normalized.includes("/node_modules/@ant-design/") ||
            normalized.includes("/node_modules/@rc-component/") ||
            /\/node_modules\/rc-[^/]+\//.test(normalized)
          ) {
            return "antd-vendor";
          }
          if (
            normalized.includes("/node_modules/axios/") ||
            normalized.includes("/node_modules/zustand/")
          ) {
            return "data-vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
