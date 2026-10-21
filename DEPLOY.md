# Deployment — We Rise Above Hydrogen on Vercel

This branch (`deploy/vercel-node`) runs the Hydrogen storefront on Vercel's
Node runtime instead of Shopify Oxygen.

## Why

The original build targets Oxygen (workerd). Vercel ingested that worker
bundle as an Edge Function and failed with
`NOW_SANDBOX_WORKER_EDGE_FUNCTION_UNSUPPORTED_MODULES` — a runtime/target
mismatch, not a Node-version or lockfile problem.

## Second fault found (2026-10-21)

The Vercel project also carried a custom **Install Command** override:
`base64 -d wra-source.tar.gz.b64 > /tmp/wra-source.tar.gz && tar -xzf ...`
That file does not exist in this repo, so every deployment failed in
seconds at the install step, regardless of source. The override was
cleared (Install Command reset to default) on 2026-10-21. Do not set a
custom install command on this project.

## Third fault found (2026-10-21) — fix/vercel-handler-bundle

With the handler exported correctly, the deployed function still died:
`ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/app/lib/session'`.
Vercel's Node runtime cannot resolve the handler's local TypeScript
source imports (`../app/lib/session`, `../app/lib/fragments`) — they
were never emitted into the function package. Fix: the deployed entry
is now a bundled file. `scripts/build-vercel-handler.mjs` (esbuild)
bundles `api/index.ts` into `api/handler.js`, inlining all local
files; npm packages and `../dist/server/index.js` stay external.
The generated `api/handler.js` is committed, and `vercel.json` routes
all traffic to `/api/handler`. (First attempt generated it during the
Vercel build instead — that deployment errored instantly, before the
build stage; a committed bundle removes the ordering question.)
`api/index.ts` remains the source of truth: after editing it, run
`npm run build:handler` and commit the regenerated `api/handler.js`.

## What changed

- `vite.config.ts` — removed the `@shopify/mini-oxygen` `oxygen()` plugin.
- `app/entry.server.tsx` — rewritten for Node (`renderToPipeableStream`).
- `api/index.ts` — Vercel Node function entry; serves the React Router
  server build from `dist/server/index.js`.
- `vercel.json` — build `npm run build`, output `dist/client`, all routes
  rewritten to `/api/index`.
- `server.ts` (Oxygen entry) is unused on this branch.

## Required Vercel env vars (values live in Vercel, never in the repo)

- `PUBLIC_STORE_DOMAIN` — `2xum4y-vk.myshopify.com`
- `PUBLIC_STOREFRONT_API_TOKEN`
- `PRIVATE_STOREFRONT_API_TOKEN`
- `SESSION_SECRET` — rotate before production launch.

## Rules

- Preview deployments only until verified. Do NOT point
  `weriseabove.life` at this project until a preview build passes
  page, product, cart, and checkout-handoff checks.
