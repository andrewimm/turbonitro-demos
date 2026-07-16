import { defineConfig } from 'turbopack'

export default defineConfig({
  entries: ['index.html'],
  // `@` → ./src, so `import { App } from '@/App'` works from anywhere.
  alias: { '@': './src' },
  server: {
    port: 3000,
    // Dev only: forward /api/* to the Nitro server running on :3001, so the
    // frontend can call same-origin `/api/preview` with no CORS. In production
    // Nitro serves this built frontend AND /api from a single origin.
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: {
    // SSG: prerender each route to HTML at build time via src/entry-server.tsx's
    // render(url); src/entry-client.tsx hydrates it. dev still serves client-side.
    output: 'static',
    prerender: ['/'],
  },
})
