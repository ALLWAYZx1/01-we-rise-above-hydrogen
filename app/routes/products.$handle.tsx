import {useEffect, useState} from 'react';
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import pageStyles from '~/styles/daylight-pages.css?url';

export function links() { return [{rel: 'stylesheet', href: pageStyles}]; }
import {getSelectedProductOptions, Analytics, useOptimisticVariant, getProductOptions, getAdjacentAndFirstAvailableVariants, useSelectedOptionInUrlParam, Image} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `${data?.product.title ?? 'Shop'} | We Rise Above`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
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
  return {product};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const selectedVariant = useOptimisticVariant(product.selectedOrFirstAvailableVariant, getAdjacentAndFirstAvailableVariants(product));
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
  const productOptions = getProductOptions({...product, selectedOrFirstAvailableVariant: selectedVariant});
  const images = product.images.nodes;
  const [activeImage, setActiveImage] = useState(images.findIndex((image: any) => image.id === selectedVariant?.image?.id));
  useEffect(() => {
    const variantImageIndex = images.findIndex((image: any) => image.id === selectedVariant?.image?.id);
    if (variantImageIndex >= 0) setActiveImage(variantImageIndex);
  }, [images, selectedVariant?.image?.id]);
  const shownImage = images[activeImage >= 0 ? activeImage : 0] || selectedVariant?.image;
  const [quantity, setQuantity] = useState(1);
  return (
    <div className="product">
      <div className="product-gallery"><p className="eyebrow">We Rise Above · No Final Form</p>{shownImage ? <Image data={shownImage} sizes="(min-width: 45em) 50vw, 100vw" /> : null}<p className="product-gallery-note">Faith in the details. Fire in the form.</p></div>
      <div className="product-main">
        <p className="eyebrow">Streetwear armor</p>
        <h1>{product.title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <br />
        <br />
        <p>
          <strong>Description</strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{__html: product.descriptionHtml}} />
        <br />
      </div>
      <Analytics.ProductView data={{products: [{id: product.id, title: product.title, price: selectedVariant?.price.amount || '0', vendor: product.vendor, variantId: selectedVariant?.id || '', variantTitle: selectedVariant?.title || '', quantity}]}} />
    </div>
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
