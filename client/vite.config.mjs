import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  build: { outDir: 'build', sourcemap: false },
  server: { proxy: { '/allPost': 'http://localhost:8000' } },
  test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.jsx' }
});
