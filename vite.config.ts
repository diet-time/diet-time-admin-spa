import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173 },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@mui') || id.includes('@emotion')) return 'ui';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@tanstack')) return 'data';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms';
          if (id.includes('i18next')) return 'i18n';
          if (id.includes('axios')) return 'http';
          return undefined;
        },
      },
    },
  },
});
