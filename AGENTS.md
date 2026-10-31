# Shopify Hydrogen development

This storefront is scaffolded from Shopify's Hydrogen skeleton template. See the README for framework-specific details.

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for all Shopify API and platform work. If missing, install it in the agent host per that page (or `npx skills add Shopify/shopify-ai-toolkit --list` for skill-compatible hosts).

## Cloud Agent notes

`npm run dev` is the Hydrogen dev server (port 3000). `app/lib/context.ts` throws on every request unless `SESSION_SECRET` is set.

With no store tokens, set `PUBLIC_STORE_DOMAIN=mock.shop` and leave `PUBLIC_STOREFRONT_API_TOKEN` and `PRIVATE_STOREFRONT_API_TOKEN` unset. Hydrogen rejects an empty token, and mock.shop rejects any token. Carts work on mock.shop. Checkout is mocked, and `/account` is unavailable. The demo catalog has no `hoodies` collection, so `/collections/hoodies` 404s until the real shop is connected.

Real shop variable names and the store domain are in `DEPLOY.md`. Do not commit secret values.
