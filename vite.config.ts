import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
      clientPort: 443,
      host: 'jendakavn.dpdns.org',
      protocol: 'wss',
    },
    allowedHosts: [
      "www.jendakavn.dpdns.org",
      "jendakavn.dpdns.org",
      "all"
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
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Tách React core để cache lâu dài vì ít thay đổi
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // Tách các thư viện UI/Icons (thường là phần nặng nhất)
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Tách Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Các node_modules khác
            return 'vendor';
          }
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
}));