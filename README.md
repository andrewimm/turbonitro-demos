# turbonitro — turbopack React SSG × Nitro API

A tiny full-stack demo where a **turbopack-built React frontend (SSG)** and a
**Nitro backend** play nicely together in development *and* in a production
build.

## What it does

Paste a URL → the page shows a **link preview card** (title, description, OG
image, favicon). A browser can't fetch an arbitrary third-party
page itself; CORS blocks cross-origin reads. So the frontend delegates to the
Nitro backend, which fetches the page server-side, parses its Open Graph
metadata, and hands the card back.

## How the two halves cooperate

| | Frontend (turbopack) | Backend (Nitro) | The seam |
| --- | --- | --- | --- |
| **Dev** (`npm run dev`) | dev server on **:3000** (HMR) | API on **:3001** | turbopack **proxies** `/api/*` → :3001, so the browser calls same-origin `/api/preview` with no CORS |
| **Build** (`npm run build && npm start`) | prerendered to `dist/` | serves `dist/` **and** `/api` | **one origin** — Nitro serves the built frontend as static assets (`publicAssets`) alongside the API |

The frontend code never changes between the two. Only the server on the other end of `/api` differs (dev proxy vs. Nitro serving directly).

## The SSG part

`build.output: 'static'` in `turbopack.config.ts` turns on prerendering:

- **`src/entry-server.tsx`** exports `render(url) => { html }` — called at **build
  time** for each route in `build.prerender` (here just `'/'`). Routing lives
  here, in userland.
- The rendered markup is baked into the `index.html` shell (replacing
  `<!--app-html-->`), so `dist/index.html` ships real content from the first request, not an empty
  div. To confirm: `grep "Link Preview" dist/index.html` after a build.
- **`src/entry-client.tsx`** calls `hydrateRoot(...)` to attach event handlers to
  that prerendered markup in the browser.

The first paint is server-rendered HTML hydration makes it interactive, and
the `Preview` button then talks to Nitro. Fast first paint + SEO + live API in one framework-less project.

## Project layout

```
index.html               # shell: <div id="root"><!--app-html--></div> + client entry
turbopack.config.ts      # output:'static', prerender:['/'], dev proxy /api → :3001
nitro.config.ts          # publicAssets: serve dist/ in production
package.json             # dev / build / start scripts
src/
  App.tsx                # the link-preview UI (fetches /api/preview)
  entry-server.tsx       # render(url) → prerendered HTML (build time)
  entry-client.tsx       # hydrateRoot() + styles
  styles.css
routes/
  api/preview.post.ts    # Nitro: fetch the URL server-side, parse OG metadata
```

## Run it

**Requires Node ≥ 22.6** (to load the TypeScript `turbopack.config.ts`).

```bash
npm install

# Development — two servers, one origin via the dev proxy:
npm run dev            # frontend http://localhost:3000  (API proxied to :3001)

# Production — single Nitro origin serving the prerendered frontend + the API:
npm run build          # turbopack build → dist/ (prerendered), then nitro build → .output/
npm start              # node .output/server/index.mjs
```

## Deploy (Vercel)

Nitro has a built-in Vercel preset — no plugin needed. Because `turbopack` is
installed from a local tarball (not yet on npm), deploy the **prebuilt** output:

```bash
NITRO_PRESET=vercel npm run build     # emits .vercel/output/ (Build Output API v3)
vercel deploy --prebuilt              # add --prod to promote
```

## Notes & caveats

- **Dev renders client-side.** In `npm run dev`, turbopack serves the app CSR
  (with HMR) — per-route prerendering only happens at `turbopack build`. Validate
  the actual SSG output via `npm run build && npm start`.
- **No `"type": "module"`.** The build-time SSG server bundle
  (`dist/server/entry-server.js`, deleted after prerender) is CommonJS, so a
  `"type":"module"` package makes Node parse it as ESM and fail. Leaving it off
  avoids that (at the cost of a cosmetic `MODULE_TYPELESS_PACKAGE_JSON` warning on
  the config load).
- **Switching `output` modes?** Clear the cache
  (`rm -rf node_modules/.cache/turbopack`) — changing `output` on a warm cache can
  skip re-emitting the server bundle.
