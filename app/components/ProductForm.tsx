import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {Maybe, ProductOptionValueSwatch} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';

export function ProductForm({
  productOptions,
  selectedVariant,
  quantity = 1,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  quantity?: number;
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  return (
    <div className="product-form daylight-product-form">
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;
        return <fieldset className="product-options" key={option.name}>
          <legend>{option.name}</legend>
          <div className="product-options-grid">
            {option.optionValues.map((value) => {
              const {name, handle, variantUriQuery, selected, available, exists, isDifferentProduct, swatch} = value;
              const style = {border: selected ? '1px solid var(--wra-gold)' : '1px solid var(--wra-border)', opacity: available ? 1 : 0.4};
              if (isDifferentProduct) return <Link className="product-options-item" key={option.name + name} prefetch="intent" preventScrollReset replace to={`/products/${handle}?${variantUriQuery}`} style={style} aria-current={selected ? 'true' : undefined}><ProductOptionSwatch swatch={swatch} name={name} /></Link>;
              return <button type="button" className="product-options-item" key={option.name + name} style={style} disabled={!exists} aria-pressed={selected} onClick={() => {if (!selected) void navigate(`?${variantUriQuery}`, {replace: true, preventScrollReset: true});}}><ProductOptionSwatch swatch={swatch} name={name} /></button>;
            })}
          </div>
        </fieldset>;
      })}
      <AddToCartButton disabled={!selectedVariant || !selectedVariant.availableForSale} onClick={() => open('cart')} lines={selectedVariant ? [{merchandiseId: selectedVariant.id, quantity, selectedVariant}] : []}>
        {selectedVariant?.availableForSale ? 'Add to bag' : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}

function ProductOptionSwatch({swatch, name}: {swatch?: Maybe<ProductOptionValueSwatch> | undefined; name: string}) {
  const image = swatch?.image?.previewImage?.url;
  if (!image) return name;
  return <span aria-label={name} className="product-option-label-swatch"><img src={image} alt={name} /></span>;
}
