import {useState} from 'react';
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import pageStyles from '~/styles/daylight-pages.css?url';

export function links() { return [{rel: 'stylesheet', href: pageStyles}]; }
import {getSelectedProductOptions, Analytics, useOptimisticVariant, getProductOptions, getAdjacentAndFirstAvailableVariants, useSelectedOptionInUrlParam, Image} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `WE RISE ABOVE | ${data?.product.title ?? 'Product'}`},
  {rel: 'canonical', href: `/products/${data?.product.handle}`},
  {name: 'description', content: data?.product.seo?.description || data?.product.description || 'WE RISE ABOVE. NO FINAL FORM.'},
];

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  if (!handle) throw new Response('Product not found', {status: 404});
  const {product} = await context.storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions: getSelectedProductOptions(request)},
  });
  if (!product?.id) throw new Response('Product not found', {status: 404});
  redirectIfHandleIsLocalized(request, {handle, data: product});
  return {product};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const selectedVariant = useOptimisticVariant(product.selectedOrFirstAvailableVariant, getAdjacentAndFirstAvailableVariants(product));
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
  const productOptions = getProductOptions({...product, selectedOrFirstAvailableVariant: selectedVariant});
  const images = product.images.nodes;
  const [activeImage, setActiveImage] = useState(images.findIndex((image: any) => image.id === selectedVariant?.image?.id));
  const shownImage = images[activeImage >= 0 ? activeImage : 0] || selectedVariant?.image;
  const [quantity, setQuantity] = useState(1);
  return (
    <main className="daylight-product-page">
      <nav className="daylight-breadcrumb" aria-label="Breadcrumb"><a href="/collections/all">Shop</a><span aria-hidden="true">/</span><span>{product.title}</span></nav>
      <div className="daylight-product-layout">
        <div className="daylight-gallery">
          <div className="daylight-gallery-main">{shownImage ? <Image data={shownImage} alt={shownImage.altText || product.title} sizes="(min-width: 900px) 55vw, 100vw" /> : <div className="daylight-image-fallback">WE RISE ABOVE</div>}</div>
          {images.length > 1 ? <div className="daylight-gallery-thumbs" aria-label="Product images">{images.map((image: any, index: number) => <button type="button" key={image.id} aria-label={`View image ${index + 1}`} aria-pressed={index === activeImage} onClick={() => setActiveImage(index)}><Image data={image} alt={image.altText || `${product.title} view ${index + 1}`} sizes="100px" /></button>)}</div> : null}
        </div>
        <div className="daylight-product-details">
          <p className="daylight-eyebrow">WE RISE ABOVE · NO FINAL FORM</p>
          <h1>{product.title}</h1>
          <ProductPrice price={selectedVariant?.price} compareAtPrice={selectedVariant?.compareAtPrice} />
          {product.description ? <p className="daylight-product-description">{product.description}</p> : null}
          <div className="daylight-quantity">
            <label htmlFor="product-quantity">Quantity</label>
            <div><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><output id="product-quantity">{quantity}</output><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(99, value + 1))}>+</button></div>
          </div>
          <ProductForm productOptions={productOptions} selectedVariant={selectedVariant} quantity={quantity} />
          <p className="daylight-checkout-note">Discount codes, including RISE10, are applied at Shopify checkout.</p>
          {product.descriptionHtml ? <div className="daylight-description-html" dangerouslySetInnerHTML={{__html: product.descriptionHtml}} /> : null}
        </div>
      </div>
      <Analytics.ProductView data={{products: [{id: product.id, title: product.title, price: selectedVariant?.price.amount || '0', vendor: product.vendor, variantId: selectedVariant?.id || '', variantTitle: selectedVariant?.title || '', quantity}]}} />
    </main>
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
      images(first: 10) { nodes { id url altText width height } }
      options { name optionValues { name firstSelectableVariant { ...DaylightProductVariant } swatch { color image { previewImage { url } } } } }
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) { ...DaylightProductVariant }
      adjacentVariants(selectedOptions: $selectedOptions) { ...DaylightProductVariant }
      seo { description title }
    }
  }
` as const;
