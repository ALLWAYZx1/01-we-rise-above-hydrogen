/**
 * Variant selection logic for ProductSpotlight, written locally against
 * the real Storefront API variant shape.
 *
 * Forward resolved selection through its own product-state module built
 * on a custom colorway model (a product was split into colorways, each
 * with exactly four mapped images). That model throws on ordinary WRA
 * products — most have no Color option at all — so it was NOT ported.
 * Here a selection is just a set of option name/value pairs matched
 * exactly against the product's real variants. Pure functions, no React,
 * so the bench can unit-test them directly.
 */

export interface SpotlightSelectedOption {
  name: string;
  value: string;
}

export interface SpotlightVariantLike {
  id: string;
  availableForSale: boolean;
  selectedOptions: SpotlightSelectedOption[];
}

/** The variant that matches every selected option exactly, if one exists. */
export function findVariant<V extends SpotlightVariantLike>(
  variants: readonly V[],
  selectedOptions: Record<string, string>,
): V | undefined {
  return variants.find((variant) =>
    variant.selectedOptions.every(
      (option) => selectedOptions[option.name] === option.value,
    ),
  );
}

/**
 * Whether choosing `value` for `optionName` (holding the rest of the
 * current selection fixed) lands on a real variant, and whether that
 * variant can be bought. Drives the sold-out / nonexistent chip states.
 */
export function optionValueState<V extends SpotlightVariantLike>(
  variants: readonly V[],
  selectedOptions: Record<string, string>,
  optionName: string,
  value: string,
): {exists: boolean; available: boolean} {
  const candidate = findVariant(variants, {
    ...selectedOptions,
    [optionName]: value,
  });
  return {
    exists: candidate !== undefined,
    available: candidate?.availableForSale === true,
  };
}

/**
 * The starting selection: the first available variant's options, or the
 * first variant's when nothing is available (the panel then reads as
 * sold out rather than crashing on an empty selection).
 */
export function initialSelection<V extends SpotlightVariantLike>(
  variants: readonly V[],
): Record<string, string> {
  const variant =
    variants.find((entry) => entry.availableForSale) ?? variants[0];
  if (!variant) return {};
  return Object.fromEntries(
    variant.selectedOptions.map((option) => [option.name, option.value]),
  );
}
