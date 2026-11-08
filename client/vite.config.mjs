import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  // Explicit public-only whitelist: never inject process.env or all env values.
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const keys = ['REACT_APP_API_BASE_URL', 'REACT_APP_WHATSAPP_NUMBER', 'REACT_APP_ENQUIRY_EMAIL'];
  const define = mode === 'test' ? {} : Object.fromEntries(keys.map(key => ['process.env.' + key, JSON.stringify(env[key] || '')]));
  return { plugins: [react({ jsxRuntime: 'automatic' })], define,
    build: { outDir: 'build', sourcemap: false },
    server: { proxy: { '/cards': 'http://localhost:8000', '/admin': 'http://localhost:8000', '/login': 'http://localhost:8000', '/logout': 'http://localhost:8000' } },
    test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.jsx' }
  };
});
