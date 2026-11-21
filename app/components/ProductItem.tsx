import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const mediaImages = (product.media?.nodes ?? []).flatMap((node) =>
    node.__typename === 'MediaImage' && node.image ? [node.image] : [],
  );
  const image = product.featuredImage ?? mediaImages[0];
  const backImage = mediaImages.find((media) => media.id !== image?.id);
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
            className="product-item-image"
            data={image}
            loading={loading}
            sizes="(min-width: 45em) 33vw, 50vw"
          />
          {backImage && (
            <Image
              alt=""
              aspectRatio="4/5"
              className="product-item-image product-item-image-back"
              data={backImage}
              loading={loading}
              sizes="(min-width: 45em) 33vw, 50vw"
            />
          )}
        </span>
      )}
      <h4>{product.title}</h4>
      <small>
        <Money data={product.priceRange.minVariantPrice} />
      </small>
    </Link>
  );
}
