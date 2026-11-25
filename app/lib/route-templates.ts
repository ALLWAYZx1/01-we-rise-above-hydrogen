import {defineShopifyRouteTemplates} from '@shopify/hydrogen';

// Route templates for handleShopifyRoutes / handleShopifyRedirects
// (mirrors repo 06). WRA has no product-in-collection route — products
// live at /products/:handle — so Shopify's default collection-prefixed
// product paths redirect onto the plain product path.
export const routeTemplates = defineShopifyRouteTemplates({
  productInCollection: '/products/:productHandle',
});
