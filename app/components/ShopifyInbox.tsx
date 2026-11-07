import {useEffect} from 'react';

/**
 * Shopify Inbox chat on the Hydrogen storefront.
 *
 * The Liquid theme gets this widget injected by Shopify automatically;
 * a headless storefront has to load the same storefront chat runtime
 * itself. The loader reads the shop identity from its own URL and
 * renders the floating launcher + Shopify-hosted conversation UI.
 *
 * Both identifiers are public — they ship in the Liquid theme's page
 * source on every load — so they live here as constants instead of
 * env vars that would gate the deploy on a dashboard step.
 * Shop: We Rise Above (weriseabovee, shop 100268966179).
 */
const INBOX_LOADER_URL =
  'https://cdn.shopify.com/shopifycloud/shopify_chat/storefront/shopifyChatV1.js' +
  '?shop_id=100268966179&shop=weriseabovee.myshopify.com';

export function ShopifyInbox() {
  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const isLoaded = () =>
      Boolean(document.querySelector('script[data-shopify-inbox]'));

    const inject = () => {
      if (cancelled || isLoaded()) return;
      const script = document.createElement('script');
      script.src = INBOX_LOADER_URL;
      script.async = true;
      script.dataset.shopifyInbox = 'true';
      document.body.appendChild(script);
    };

    // Load on mount instead of waiting for the window 'load' event.
    // The previous version armed a one-time 'load' listener; when the
    // component mounted after 'load' had already fired (or the event
    // raced hydration), the listener never ran and the chat silently
    // never loaded — the launcher appeared only intermittently, and
    // vanished for good on SPA navigation. If the document is still
    // parsing, wait for DOMContentLoaded; otherwise load now.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, {once: true});
    } else {
      inject();
    }

    // Watchdog: if the loader still hasn't produced the chat iframe
    // after 8s (blocked request, CSP refusal, network drop), retry the
    // injection once. A failed script element is removed first so the
    // retry is a real second attempt, not a no-op.
    timer = window.setTimeout(() => {
      if (cancelled) return;
      if (document.querySelector('iframe[title*="Shopify"]')) return;
      document.querySelector('script[data-shopify-inbox]')?.remove();
      inject();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('DOMContentLoaded', inject);
    };
  }, []);

  return null;
}
