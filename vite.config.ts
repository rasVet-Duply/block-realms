import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ziteId } from 'zitejs/vite-plugin';
import { insertHtml, h } from 'vite-plugin-insert-html';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const pkgDeps = Object.keys(pkg.dependencies).filter(d => d !== 'zitejs')
  // Need to exclude @tiptap/pm from optimization, since it doesn't have a top level entry point
  .filter(dep => dep !== '@tiptap/pm');

const deps = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-dom/server',
  ...pkgDeps,
]);

// https://vite.dev/config/
const __ziteFlowId = (() => { try { return JSON.parse(readFileSync(path.resolve(__dirname, 'zite.config.json'), 'utf-8')).id ?? ''; } catch { return ''; } })();
export default defineConfig(({ command }) => ({
  define: { 'import.meta.env.VITE_ZITE_FLOW_ID': JSON.stringify(__ziteFlowId), },
  build: { target: 'esnext', sourcemap: false, reportCompressedSize: false },
  server: {
    host: '::',
    port: 8080,
    cors: true,
    hmr: {
      overlay: false,
    },
    allowedHosts: [
      '.zite-sandbox.com',
      '.zite-dev-sandbox.com',
      '.zite-app.com',
      '.zite-dev-app.com',
    ],
  },
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  optimizeDeps: {
    exclude: ["zitejs/db", "zitejs/api", "zitejs/auth", "zitejs/backend", "zitejs/integrations", "zitejs/email", "zitejs/meta"],
    include: [...deps],
    entries: ['index.html', 'src/**/*.{ts,tsx,js,jsx}'],
  },
  plugins: [
    react(),
    insertHtml({
      headPrepend: [
        h('script', {
          src:
            process.env.VITE_APP_RUNTIME_URL ||
            'https://zite.com/app-runtime.js',
        }),
      ],
    }),
    ziteId(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@project/components': path.resolve(__dirname, './src/components'),
      "zitejs/auth/base": path.resolve(__dirname, "../../node_modules/zitejs/dist/esm/auth/index.js"),
      "zitejs/backend/base": path.resolve(__dirname, "../../node_modules/zitejs/dist/esm/backend/index.js"),
      "zitejs/db": path.resolve(__dirname, "../../.zite/db.ts"),
      "zitejs/api": path.resolve(__dirname, "./.zite/api.ts"),
      "zitejs/backend": path.resolve(__dirname, "./.zite/backend.ts"),
      "zitejs/caller": path.resolve(__dirname, "../../node_modules/zitejs/dist/esm/caller/index.js"),
      "zitejs/integrations": path.resolve(__dirname, "./.zite/integrations/airtable.ts"),
      "zitejs/email": path.resolve(__dirname, "./.zite/integrations/email.ts"),
      "zitejs/meta": path.resolve(__dirname, "./.zite/meta.ts"),
    },
  },
}));
