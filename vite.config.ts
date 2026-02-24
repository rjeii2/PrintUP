import { defineConfig } from 'vite';
export default defineConfig({ test: { environment: 'jsdom', include: ['tests/**/*.test.ts','tests/**/*.test.tsx'], exclude: ['e2e/**','node_modules/**'] } });
