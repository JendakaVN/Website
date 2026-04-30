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
        // ✅ Cách 1: Gộp tất cả làm 1 chunk (đơn giản nhất, không circular)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
        
        // ✅ Cách 2: Phân tách nhưng không gây circular (chỉ dùng 2 nhóm)
        // manualChunks(id) {
        //   if (id.includes('node_modules')) {
        //     if (id.includes('react') || id.includes('react-dom')) {
        //       return 'vendor-react';
        //     }
        //     return 'vendor';
        //   }
        // }
        
        // ✅ Cách 3: Giữ 3 nhóm nhưng tách React core hoàn toàn
        // manualChunks: {
        //   vendor: ['axios', 'lodash', '@tanstack/react-query', '@tanstack/query-core'],
        //   'vendor-react': ['react', 'react-dom', 'react-router-dom', 'scheduler', '@remix-run/router'],
        //   'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
        // }
      },
    },
  },
}));