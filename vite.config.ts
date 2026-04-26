import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    allowedHosts: [
      "www.jendakavn.dpdns.org",
      "jendakavn.dpdns.org",
      "f415-14-191-104-70.ngrok-free.app",
      "bd44-14-191-104-70.ngrok-free.app"
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Xử lý ưu tiên react và react-dom trước
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('axios') || id.includes('lodash') || id.includes('@tanstack')) {
              return 'vendor-utils';
            }
            // Trả về 'vendor' cho các node_modules còn lại
            return 'vendor';
          }
        }
      },
    },
  },
}));