/**
 * ProductSpotlight — REBUILT from Forward's `product-spotlight` section.
 *
 * Only the presentation and interaction design were carried over: a
 * colorway-style gallery, price with sale comparison, option selection,
 * a spec list, thumbnails and an add-to-cart flow. Everything under it
 * is native to the scaffold:
 * - Forward's product state (`resolveProductSelection`,
 *   `findExactVariant`, `colorwayIsSoldOut`, `galleryImages`,
 *   `productSelectionHref`, `saleCompareAtPrice`, `colorwaySwatchStyle`)
 *   was built on Forward's custom colorway model, which 500s on WRA
 *   products (no Color option, no 4-image colorway map, no image at
 *   all). It was NOT ported. Selection is the local exact-match logic in
 *   `./spotlight-selection`, run against the product's real variants.
 * - The cart rides the scaffold's `AddToCartButton` (Hydrogen `CartForm`
 *   → `/cart` LinesAdd), exactly like the scaffold's own product page.
 * - `IMAGES_PLACEHOLDERS` from `@weaverse/hydrogen/next` (Forward's
 *   null-product placeholder art, `$00.00` fake price, fake chips) is on
 *   the kill list: a null product renders NOTHING here.
 * - "Color" is just an option group like any other when the product has
 *   one; when it does not (36 of the 68 real WRA products), the gallery
 *   is simply the product's images and the panel has no color row.
 * - A product with no images renders an honest empty media panel — no
 *   borrowed artwork, no fake photo.
 *
 * RESKIN v1: presentation dressed in the locked tokens only — VOID
 * BLACK ground, DEEP BLACK buy panel, ivory display-serif title, gold
 * hairlines on the spec list, gold/champagne option chips, and the
 * add-to-cart submit skinned from `wra-reskin.css` (the scaffold's
 * AddToCartButton renders it unstyled). Selection, quantity and the
 * CartForm wiring are byte-for-byte the proven port behavior.
 */
import {useState} from 'react';
import {Link, useLocation} from 'react-router';
import {Image, Money} from '~/lib/legacy-components';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {getVariantUrl} from '~/lib/variants';
import type {SectionImage} from './section-types';
import {
  findVariant,
  initialSelection,
  optionValueState,
} from './spotlight-selection';

export interface SpotlightSpec {
  label: string;
  value: string;
}

export interface SpotlightOptionValue {
  name: string;
  swatchColor?: string | null;
}

export interface SpotlightOption {
  name: string;
  values: SpotlightOptionValue[];
}

export interface SpotlightVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
  sku?: string | null;
  image?: SectionImage | null;
  selectedOptions: {name: string; value: string}[];
}

export interface SpotlightProduct {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  productType?: string | null;
  vendor?: string | null;
  options: SpotlightOption[];
  variants: SpotlightVariant[];
  images: SectionImage[];
}

export interface ProductSpotlightProps {
  eyebrowPrefix?: string;
  ctaLabel?: string;
  specCount?: number;
  imagePosition?: 'left' | 'right';
  showThumbnails?: boolean;
  /** Resolved by the route loader. `null` renders nothing (no placeholder). */
  product: SpotlightProduct | null;
  /** Static product attributes shown as the spec list. */
  specs?: SpotlightSpec[];
}

const OPTION_CHIP_BASE =
  'relative inline-flex min-h-11 min-w-12 cursor-pointer items-center justify-center gap-2 border px-3.5 py-2 text-xs font-bold';

export function ProductSpotlight({
  eyebrowPrefix,
  ctaLabel,
  specCount = 3,
  imagePosition = 'left',
  showThumbnails = true,
  product,
  specs = [],
}: ProductSpotlightProps) {
  if (product === null) return null;
  return <SpotlightBody {...{eyebrowPrefix, ctaLabel, specCount, imagePosition, showThumbnails, product, specs}} />;
}

function SpotlightBody({
  eyebrowPrefix,
  ctaLabel,
  specCount,
  imagePosition,
  showThumbnails,
  product,
  specs = [],
}: ProductSpotlightProps & {product: SpotlightProduct}) {
  const {pathname} = useLocation();
  const {open} = useAside();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () => initialSelection(product.variants),
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const variant = findVariant(product.variants, selectedOptions);
  const images = product.images;
  const preview = variant?.image ?? images[activeImage] ?? images[0] ?? null;
  const specsShown = specs.slice(0, specCount);
  const detailsUrl = getVariantUrl({
    handle: product.handle,
    pathname,
    searchParams: new URLSearchParams(),
    selectedOptions: Object.entries(selectedOptions).map(([name, value]) => ({
      name,
      value,
    })),
  });

  const canBuy = variant !== undefined && variant.availableForSale;

  return (
    <section
      data-section="product-spotlight"
      className="wra-spotlight bg-[var(--wra-void)] px-5 py-14 text-[var(--wra-ivory)] md:px-10 md:py-20"
    >
      <div
        className={`mx-auto grid max-w-[1400px] grid-cols-1 items-stretch gap-6 md:min-h-[560px] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-10 ${
          imagePosition === 'right' ? 'md:[&>*:first-child]:order-2' : ''
        }`}
      >
        {/* Gallery */}
        <div
          className={`grid min-w-0 content-start gap-3 md:content-stretch ${
            showThumbnails && images.length > 1
              ? 'md:grid-cols-[88px_minmax(0,1fr)]'
              : ''
          }`}
        >
          {preview ? (
            <Image
              key={preview.url}
              className="aspect-4/5 w-full bg-[var(--wra-panel)] object-cover md:aspect-auto md:h-full"
              data={preview}
              alt={preview.altText || product.title}
              sizes="(min-width: 820px) 55vw, 100vw"
            />
          ) : (
            <div
              data-empty-state="spotlight-media"
              className="flex aspect-4/5 w-full items-center justify-center border border-dashed border-[var(--wra-gold-line)] bg-[var(--wra-panel)] md:aspect-auto md:h-full"
            >
              <span className="px-6 text-center text-sm tracking-[0.14em] text-[var(--wra-ivory-70)] uppercase">
                No image for this product
              </span>
            </div>
          )}
          {showThumbnails && images.length > 1 ? (
            <div className="grid grid-cols-4 content-start gap-2 md:order-first md:grid-cols-1">
              {images.map((image, index) => (
                <button
                  key={image.url + String(index)}
                  type="button"
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-pressed={index === activeImage}
                  onClick={() => setActiveImage(index)}
                  className={`cursor-pointer border-2 p-0 transition-opacity duration-700 ${
                    index === activeImage
                      ? 'border-[var(--wra-gold)]'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    className="aspect-4/5 w-full bg-[var(--wra-panel)] object-cover"
                    data={image}
                    alt=""
                    sizes="140px"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Buy panel */}
        <div className="flex min-w-0 flex-col justify-center bg-[var(--wra-panel)] p-7 md:p-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[var(--wra-gold)] uppercase">
            {[eyebrowPrefix, product.productType].filter(Boolean).join(' · ')}
          </p>
          <h2 className="wra-display mt-3 text-3xl leading-tight font-bold tracking-tight uppercase md:text-5xl">
            {product.title}
          </h2>
          {variant ? (
            <p className="mt-3 mb-0 flex flex-wrap items-baseline gap-2.5 text-lg">
              <strong>
                <span className="sr-only">
                  {variant.compareAtPrice ? 'Sale price' : 'Price'}{' '}
                </span>
                <Money data={variant.price} />
              </strong>
              {variant.compareAtPrice ? (
                <del className="text-[var(--wra-ivory-70)]">
                  <span className="sr-only">Regular price </span>
                  <Money data={variant.compareAtPrice} />
                </del>
              ) : null}
            </p>
          ) : null}
          {product.description ? (
            <p className="mt-4 mb-0 leading-relaxed text-[var(--wra-ivory-80)]">
              {product.description.length > 180
                ? `${product.description.slice(0, 180)}…`
                : product.description}
            </p>
          ) : null}

          {product.options.map((option) => {
            if (option.values.length === 1) return null;
            return (
              <fieldset className="mt-6 mb-0 border-0 p-0" key={option.name}>
                <legend className="sr-only">{option.name}</legend>
                <div className="mb-2.5 flex justify-between text-[11px] font-semibold tracking-[0.18em] uppercase">
                  <span>{option.name}</span>
                  <span>{selectedOptions[option.name]}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const state = optionValueState(
                      product.variants,
                      selectedOptions,
                      option.name,
                      value.name,
                    );
                    const selected =
                      selectedOptions[option.name] === value.name;
                    return (
                      <button
                        key={value.name}
                        type="button"
                        className={`${OPTION_CHIP_BASE} ${
                          selected
                            ? 'border-[var(--wra-gold)] bg-[var(--wra-gold)] text-[var(--wra-void)]'
                            : 'border-[var(--wra-ivory-25)] bg-transparent text-[var(--wra-ivory)] hover:border-[var(--wra-champagne)]'
                        } ${state.available ? '' : 'text-[var(--wra-ivory-70)] line-through'}`}
                        aria-pressed={selected}
                        aria-label={`${value.name} ${option.name.toLowerCase()}${state.available ? '' : ' (sold out)'}`}
                        disabled={!state.exists}
                        onClick={() =>
                          setSelectedOptions({
                            ...selectedOptions,
                            [option.name]: value.name,
                          })
                        }
                      >
                        {value.swatchColor ? (
                          <span
                            aria-hidden="true"
                            className="size-3 border border-black/25"
                            style={{backgroundColor: value.swatchColor}}
                          />
                        ) : null}
                        {value.name}
                        {state.available ? null : (
                          <span className="sr-only"> (sold out)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {specsShown.length > 0 ? (
            <ul className="mt-6 mb-0 list-none border-t border-[var(--wra-gold-line)] p-0">
              {specsShown.map((spec) => (
                <li
                  key={spec.label}
                  className="flex justify-between gap-5 border-b border-[var(--wra-gold-line)] py-3 text-sm"
                >
                  <span className="text-[var(--wra-ivory-70)]">{spec.label}</span>
                  <strong>{spec.value}</strong>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-7 flex gap-3">
            <div
              className="flex items-center border border-[var(--wra-gold-line)]"
              aria-label="Quantity"
            >
              <button
                type="button"
                aria-label="Decrease quantity"
                className="cursor-pointer px-3 py-2 text-lg font-bold disabled:opacity-30"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="min-w-8 text-center font-bold" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                className="cursor-pointer px-3 py-2 text-lg font-bold disabled:opacity-30"
                disabled={quantity >= 99}
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              >
                +
              </button>
            </div>
            <AddToCartButton
              disabled={!canBuy}
              onClick={() => {
                open('cart');
              }}
              lines={
                variant
                  ? [
                      {
                        merchandiseId: variant.id,
                        quantity,
                        selectedVariant: variant,
                      },
                    ]
                  : []
              }
            >
              {variant
                ? variant.availableForSale
                  ? 'Add to cart'
                  : 'Sold out'
                : 'Unavailable'}
            </AddToCartButton>
          </div>

          <Link
            className="mt-4 self-start text-sm font-bold tracking-[0.14em] text-[var(--wra-gold)] uppercase transition-colors duration-700 hover:text-[var(--wra-champagne)]"
            to={detailsUrl}
          >
            {ctaLabel || 'View details'} →
          </Link>
        </div>
      </div>
    </section>
  );
}
