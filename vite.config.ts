import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";


export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist/renderer",
    target: "baseline-widely-available",
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        passes: 3
      },
      mangle: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        }
      }
    },
    sourcemap: false,
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ["monaco-editor"],
  },
  worker: {
    format: "es",
  },
});