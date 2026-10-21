# Deployment — We Rise Above Hydrogen on Vercel

This branch (`deploy/vercel-node`) runs the Hydrogen storefront on Vercel's
Node runtime instead of Shopify Oxygen.

## Why

The original build targets Oxygen (workerd). Vercel ingested that worker
bundle as an Edge Function and failed with
`NOW_SANDBOX_WORKER_EDGE_FUNCTION_UNSUPPORTED_MODULES` — a runtime/target
mismatch, not a Node-version or lockfile problem.

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
