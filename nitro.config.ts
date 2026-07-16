export default defineNitroConfig({
  compatibilityDate: '2026-07-16',
  // In production, serve the turbopack-built frontend (dist/) as static files
  // from the same origin that serves /api. (Unused in dev — turbopack serves
  // the frontend on :3000 and proxies /api here.)
  publicAssets: [{ dir: 'dist', baseURL: '/' }],
})
