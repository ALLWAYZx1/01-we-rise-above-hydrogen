import {useState} from 'react';
import {Link, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import pageStyles from '~/styles/daylight-pages.css?url';
import conversionStyles from '~/styles/conversion.css?url';

export function links() {
  return [
    {rel: 'stylesheet', href: pageStyles},
    {rel: 'stylesheet', href: conversionStyles},
  ];
}
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Image,
  Money,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductForm} from '~/components/ProductForm';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => {
  const title = `${data?.product.title ?? 'Shop'} | We Rise Above`;
  const description =
    data?.product.seo?.description ||
    data?.product.description?.replace(/\\s+/g, ' ').trim().slice(0, 160) ||
    '';
  const image = data?.product.images?.nodes?.[0]?.url || '';
  const url = data?.product.handle
    ? `https://weriseabove.life/products/${data.product.handle}`
    : 'https://weriseabove.life/';
  return [
    {title},
    {name: 'description', content: description},
    {rel: 'canonical', href: url},
    {property: 'og:type', content: 'product'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: url},
    ...(image ? [{property: 'og:image', content: image}] : []),
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    ...(image ? [{name: 'twitter:image', content: image}] : []),
  ];
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  if (!handle) throw new Response('Product not found', {status: 404});
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions: getSelectedProductOptions(request)},
  });
  if (!product?.id) throw new Response('Product not found', {status: 404});
  redirectIfHandleIsLocalized(request, {handle, data: product});
  // Related products power the "Complete the Look" rail at the bottom of
  // the page. Recommendations are a guidance nicety, never a page failure:
  // if the query errors, the page renders without the rail.
  const {productRecommendations} = await context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY, {variables: {productId: product.id}})
    .catch(() => ({productRecommendations: null}));
  const recommended = (productRecommendations ?? [])
    .filter((item: any) => item.id !== product.id)
    .slice(0, 4);
  return {product, recommended};
}

export default function Product() {
  const {product, recommended} = useLoaderData<typeof loader>();
  const {open, type: asideType} = useAside();
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
  // getProductOptions() returns [] unless encodedVariantExistence and
  // encodedVariantAvailability are on the product. Without them the size
  // and color pickers never render, even when the catalog has variants.
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });
  const images = product.images.nodes;
  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: images.map((image: any) => image.url),
    description: product.description?.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim(),
    brand: {'@type': 'Brand', name: 'We Rise Above'},
    url: `https://weriseabove.life/products/${product.handle}`,
    offers: selectedVariant
      ? {
          '@type': 'Offer',
          url: `https://weriseabove.life/products/${product.handle}`,
          priceCurrency: selectedVariant.price.currencyCode,
          price: selectedVariant.price.amount,
          availability: selectedVariant.availableForSale
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        }
      : undefined,
  };
  const variantImageIndex = images.findIndex(
    (image: any) => image.id === selectedVariant?.image?.id,
  );
  const [activeImageSelection, setActiveImageSelection] = useState<{
    variantId: string | null;
    index: number;
  } | null>(null);
  const activeImage =
    activeImageSelection?.variantId === (selectedVariant?.id ?? null)
      ? activeImageSelection.index
      : variantImageIndex;
  const setActiveImage = (index: number) => {
    setActiveImageSelection({
      variantId: selectedVariant?.id ?? null,
      index,
    });
  };
  const shownImage =
    images[activeImage >= 0 ? activeImage : 0] || selectedVariant?.image;
  const [quantity, setQuantity] = useState(1);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      <div className="product">
        <div className="product-gallery">
          <p className="eyebrow">We Rise Above · No Final Form</p>
          {shownImage ? (
            <Image data={shownImage} sizes="(min-width: 45em) 50vw, 100vw" />
          ) : null}
          {images.length > 1 ? (
            <div className="product-thumbnails">
              {images.map((image: any, index: number) => (
                <button
                  type="button"
                  key={image.id}
                  className={
                    index === activeImage
                      ? 'product-thumb product-thumb-active'
                      : 'product-thumb'
                  }
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image data={image} sizes="80px" />
                </button>
              ))}
            </div>
          ) : null}
          <p className="product-gallery-note">
            Faith in the details. Fire in the form.
          </p>
        </div>
        <div className="product-main">
          <p className="eyebrow">Streetwear armor</p>
          <h1>{product.title}</h1>
          <ProductPrice
            price={selectedVariant?.price}
            compareAtPrice={selectedVariant?.compareAtPrice}
          />
          <ProductForm
            productOptions={productOptions}
            selectedVariant={selectedVariant}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
          <br />
          <br />
          <p>
            <strong>Description</strong>
          </p>
          <br />
          <div dangerouslySetInnerHTML={{__html: product.descriptionHtml}} />
          <br />
          <section className="product-trust">
            <ul>
              <li>Printed to order</li>
              <li>Ships from the USA</li>
              <li>Secure Shopify checkout</li>
            </ul>
            <p>
              <a href="/policies/shipping-policy">Shipping policy</a>
              {' · '}
              <a href="/policies/refund-policy">Refund policy</a>
            </p>
          </section>
        </div>
        <Analytics.ProductView
          data={{
            products: [
              {
                id: product.id,
                title: product.title,
                price: selectedVariant?.price.amount || '0',
                vendor: product.vendor,
                variantId: selectedVariant?.id || '',
                variantTitle: selectedVariant?.title || '',
                quantity,
              },
            ],
          }}
        />
      </div>
      {recommended.length > 0 ? (
        <section className="wra-related" aria-label="Complete the look">
          <h2>Complete the Look</h2>
          <div className="wra-related-grid">
            {recommended.map((item: any) => (
              <Link
                className="product-item"
                key={item.id}
                prefetch="intent"
                to={`/products/${item.handle}`}
              >
                {item.featuredImage ? (
                  <Image
                    alt={item.featuredImage.altText || item.title}
                    aspectRatio="4/5"
                    data={item.featuredImage}
                    sizes="(min-width: 700px) 25vw, 50vw"
                  />
                ) : null}
                <h4>{item.title}</h4>
                <small>
                  <Money data={item.priceRange.minVariantPrice} />
                </small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {selectedVariant && asideType === 'closed' ? (
        <div className="wra-sticky-buy">
          <div className="wra-sticky-buy-info">
            <span className="wra-sticky-buy-title">{product.title}</span>
            <span className="wra-sticky-buy-variant">
              {selectedVariant.title} · <Money data={selectedVariant.price} />
            </span>
          </div>
          <AddToCartButton
            disabled={!selectedVariant.availableForSale}
            onClick={() => open('cart')}
            lines={[
              {
                merchandiseId: selectedVariant.id,
                quantity,
                selectedVariant,
              },
            ]}
          >
            {selectedVariant.availableForSale ? 'Add to bag' : 'Sold out'}
          </AddToCartButton>
        </div>
      ) : null}
    </>
  );
}

const PRODUCT_QUERY = `#graphql
  fragment DaylightProductVariant on ProductVariant {
    availableForSale compareAtPrice { amount currencyCode } id
    image { id url altText width height }
    price { amount currencyCode }
    product { title handle }
    selectedOptions { name value }
    sku title unitPrice { amount currencyCode }
  }
  query DaylightProduct($country: CountryCode, $handle: String!, $language: LanguageCode, $selectedOptions: [SelectedOptionInput!]!)
    @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id title vendor handle descriptionHtml description
      encodedVariantExistence
      encodedVariantAvailability
      images(first: 10) { nodes { id url altText width height } }
      options { name optionValues { name firstSelectableVariant { ...DaylightProductVariant } swatch { color image { previewImage { url } } } } }
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) { ...DaylightProductVariant }
      adjacentVariants(selectedOptions: $selectedOptions) { ...DaylightProductVariant }
      seo { description title }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  query ProductRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $productId: ID!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId, intent: RELATED) {
      id
      title
      handle
      featuredImage {
        id
        url
        altText
        width
        height
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
` as const;
