import {useEffect} from 'react';

// Klaviyo Reviews (account Tz6eYC, We Rise Above) hydrates into the two
// divs below once klaviyo.js loads. Client-only: the storefront renders an
// empty placeholder, Klaviyo fills it in. If the script fails to load the
// page degrades to an empty section, never an error.
const KLAVIYO_COMPANY_ID = 'Tz6eYC';
const KLAVIYO_JS_SRC = `https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${KLAVIYO_COMPANY_ID}`;

// Klaviyo wants the NUMERIC Shopify product ID; the Storefront API gives a
// gid like gid://shopify/Product/123456789.
function numericProductId(gid: string): string {
  const match = gid.match(/(\d+)$/);
  return match ? match[1] : '';
}

function useKlaviyoScript() {
  useEffect(() => {
    if (document.querySelector(`script[src="${KLAVIYO_JS_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = KLAVIYO_JS_SRC;
    script.async = true;
    document.head.appendChild(script);
  }, []);
}

// Star rating shown under the product title. Klaviyo's widget settings
// control whether it hides itself when a product has no reviews yet.
export function KlaviyoStarRating({
  product,
}: {
  product: {id: string; title: string; productType?: string | null};
}) {
  useKlaviyoScript();
  const id = numericProductId(product.id);
  if (!id) return null;
  return (
    <div
      className="klaviyo-star-rating-widget"
      data-id={id}
      data-product-title={product.title}
      data-product-type={product.productType ?? ''}
    />
  );
}

// Full reviews block (summary chart + list + Write a Review) at the bottom
// of the product page.
export function KlaviyoProductReviews({productId}: {productId: string}) {
  useKlaviyoScript();
  const id = numericProductId(productId);
  if (!id) return null;
  return <div id="klaviyo-reviews-all" data-id={id} />;
}
