import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⭐️ عدّل هذا السطر ليكون اسم المستودع بين علامات التنصيص
  base: '/qatiyyat/', 
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});