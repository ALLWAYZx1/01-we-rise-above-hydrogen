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
    if (document.querySelector('script[data-shopify-inbox]')) return;

    const load = () => {
      if (document.querySelector('script[data-shopify-inbox]')) return;
      const script = document.createElement('script');
      script.src = INBOX_LOADER_URL;
      script.async = true;
      script.dataset.shopifyInbox = 'true';
      document.body.appendChild(script);
    };

    // Load after the page settles so the chat never competes with the
    // storefront's own first paint, and only ever load it once.
    if (document.readyState === 'complete') {
      load();
      return;
    }
    window.addEventListener('load', load, {once: true});
    return () => window.removeEventListener('load', load);
  }, []);

  return null;
}
