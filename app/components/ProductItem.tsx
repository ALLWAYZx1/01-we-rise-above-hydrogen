import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

type CardImage = {
  id?: string;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
};

/**
 * Printful names its mockups "<blank>-<color>-<view>-<hash>.jpg", so the
 * back shot of the color on display shares the front shot's filename stem
 * with "-front" swapped for "-back". Match that first; fall back to any
 * back view the product carries.
 */
function findBackImage(
  images: CardImage[] | undefined,
  frontUrl: string | undefined,
): CardImage | undefined {
  if (!images?.length) return undefined;
  const stem = (url: string) =>
    url
      .split('/')
      .pop()
      ?.replace(/\.[a-z0-9]+(\?.*)?$/i, '')
      .replace(/-[a-z0-9]{6,}$/i, '') ?? '';
  const frontStem = frontUrl ? stem(frontUrl) : '';
  const backStem = frontStem.replace(/-front$/i, '-back');
  return (
    images.find(
      (img) => stem(img.url) === backStem && stem(img.url) !== frontStem,
    ) ?? images.find((img) => /-back-/i.test(img.url) && img.url !== frontUrl)
  );
}

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  // `images` is fetched by the ProductItem / CollectionItem /
  // RecommendedProduct fragments; the generated types catch up on the
  // next codegen run, so read it through a structural cast until then.
  const images = (
    product as unknown as {images?: {nodes?: CardImage[]} | null}
  ).images?.nodes;
  const backImage = findBackImage(images, image?.url);
  return (
    <Link
      className="product-item"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      {image && (
        <span className="product-item-media">
          <Image
            alt={image.altText || product.title}
            aspectRatio="4/5"
            data={image}
            loading={loading}
            sizes="(min-width: 700px) 25vw, 50vw"
          />
          {backImage && (
            <Image
              alt={backImage.altText || `${product.title} — back`}
              aspectRatio="4/5"
              className="product-item-img--back"
              data={backImage}
              loading="lazy"
              sizes="(min-width: 700px) 25vw, 50vw"
            />
          )}
        </span>
      )}
      <span className="product-card-kicker">We Rise Above · Essential</span>
      <h3>{product.title}</h3>
      <small>
        <Money data={product.priceRange.minVariantPrice} />
      </small>
    </Link>
  );
}
