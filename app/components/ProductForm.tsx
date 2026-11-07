import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {DaylightProductQuery} from 'storefrontapi.generated';

export function ProductForm({
  productOptions,
  selectedVariant,
  quantity = 1,
  onQuantityChange,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: NonNullable<DaylightProductQuery['product']>['selectedOrFirstAvailableVariant'];
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  // Buy Now rides Shopify's cart permalink route (/cart/<id>:<qty>), which
  // builds a cart from the selected variant and redirects straight to
  // checkout. The variant id arrives as a gid; the permalink wants the
  // numeric tail.
  const buyNowVariantId = selectedVariant?.id?.split('/').pop();
  return (
    <div className="product-form daylight-product-form">
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;
        return (
          <fieldset className="product-options" key={option.name}>
            <legend>{option.name}</legend>
            <div className="product-options-grid">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;
                const style = {
                  border: selected
                    ? '1px solid var(--wra-gold)'
                    : '1px solid var(--wra-border)',
                  opacity: available ? 1 : 0.4,
                };
                if (isDifferentProduct)
                  return (
                    <Link
                      className="product-options-item"
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                      style={style}
                      aria-current={selected ? 'true' : undefined}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </Link>
                  );
                return (
                  <button
                    type="button"
                    className="product-options-item"
                    key={option.name + name}
                    style={style}
                    disabled={!exists}
                    aria-pressed={selected}
                    onClick={() => {
                      if (!selected)
                        void navigate(`?${variantUriQuery}`, {
                          replace: true,
                          preventScrollReset: true,
                        });
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      {onQuantityChange ? (
        <div className="product-quantity">
          <span id="quantity-label">Quantity</span>
          <div>
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <output aria-live="polite" aria-labelledby="quantity-label">
              {quantity}
            </output>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= 10}
              onClick={() => onQuantityChange(Math.min(10, quantity + 1))}
            >
              +
            </button>
          </div>
        </div>
      ) : null}
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => open('cart')}
        lines={
          selectedVariant
            ? [{merchandiseId: selectedVariant.id, quantity, selectedVariant}]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to bag' : 'Sold out'}
      </AddToCartButton>
      {selectedVariant?.availableForSale && buyNowVariantId ? (
        <a
          className="wra-buy-now"
          href={`/cart/${buyNowVariantId}:${quantity}`}
        >
          Buy Now
        </a>
      ) : null}
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  if (!image) return name;
  return (
    <span aria-label={name} className="product-option-label-swatch">
      <img src={image} alt={name} />
    </span>
  );
}
