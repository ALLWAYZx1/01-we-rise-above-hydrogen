import {useEffect, useState} from 'react';
import {
  useFetcher,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from 'react-router';
import type {
  CartLineInput,
  Product,
  ProductOptionValueSwatch,
  ProductVariant,
} from '@shopify/hydrogen/storefront-api-types';

import type {CartApiQueryFragment} from 'storefrontapi.generated';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PHASE 1 LEGACY BRIDGES for the Hydrogen components/helpers removed in
 * 2026.10 (the classic package exported Money, Image, CartForm,
 * Pagination, Analytics and the OptimisticCart helpers; 2026.10 moved
 * cart rendering into app-owned components driven by server handlers).
 *
 *   • Money / Image / flattenConnection — REAL local implementations,
 *     kept permanently (repo 06 ships equivalents the same way).
 *   • CartForm — REAL form contract (ACTIONS + inputs + render-prop
 *     fetcher, byte-compatible with the classic one at the component
 *     surface). Phase 4 binds it to the Phase 2 server contract: each
 *     action is translated into the /api/cart field-based JSON protocol
 *     (exactly one of lines / discountCodes / attributes / note per
 *     body; remove = line id + quantity 0), and gift-card /
 *     buyer-identity actions post to /api/cart-bridge, whose route
 *     action runs the bridge's direct Storefront mutations
 *     (~/lib/cart-extensions). `getFormInput` is retained for API
 *     compatibility; no route action consumes it any more.
 *   • Pagination — RETIRED in Phase 4: the server-rendered component
 *     now lives at ~/components/Pagination (Previous/Next are real links
 *     carrying the direction/cursor params that ~/lib/pagination
 *     reads).
 *   • Analytics / useAnalytics — inert passthrough. TODO(Phase 4):
 *     re-implement on the 2026.10 tracker components
 *     (PageViewedTracker / CartAnalyticsTracker, as repo 06 does) and
 *     wire GA G-F7SLHQZBWV + Meta pixel 2793791147688986 there.
 *   • useOptimisticCart — identity: the server cart is the source of
 *     truth in Phase 1; optimistic merging returns with Phase 2's
 *     handlers.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Money ────────────────────────────────────────────────────────────────

export type MoneyData = {
  amount: string;
  currencyCode: string;
};

export type MoneyProps = {
  data: MoneyData;
  withoutCurrency?: boolean;
  withoutTrailingZeros?: boolean;
  as?: 'span' | 'div' | 'p' | 'output';
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>;

export function Money({
  data,
  withoutCurrency,
  withoutTrailingZeros,
  as: Tag = 'span',
  ...rest
}: MoneyProps) {
  const amount = Number.parseFloat(data.amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: withoutCurrency ? 'decimal' : 'currency',
    currency: data.currencyCode,
    minimumFractionDigits: withoutTrailingZeros && Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return <Tag {...rest}>{formatted}</Tag>;
}

// ── Image ────────────────────────────────────────────────────────────────

type ImageData = {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type ImageProps = {
  data?: ImageData | null;
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  sizes?: string;
  crop?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  loading?: 'eager' | 'lazy';
} & Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'width' | 'height' | 'loading'
>;

const SRCSET_WIDTHS = [256, 512, 768, 1024, 1280, 1536, 1920, 2560];

export function Image({
  data,
  src,
  alt,
  width,
  height,
  aspectRatio,
  sizes,
  crop: _crop,
  style,
  ...rest
}: ImageProps) {
  const url = data?.url ?? src;
  if (!url) return null;
  const separator = url.includes('?') ? '&' : '?';
  const widths = SRCSET_WIDTHS.filter((w) => !data?.width || w <= data.width);
  const srcSet = (widths.length ? widths : [data?.width ?? 1024])
    .map((w) => `${url}${separator}width=${w} ${w}w`)
    .join(', ');
  const ratio =
    aspectRatio ??
    (data?.width && data?.height ? `${data.width} / ${data.height}` : undefined);
  return (
    <img
      src={url}
      srcSet={srcSet}
      sizes={sizes}
      width={width ?? data?.width ?? undefined}
      height={height ?? data?.height ?? undefined}
      alt={alt ?? data?.altText ?? ''}
      style={ratio ? {aspectRatio: ratio, ...style} : style}
      {...rest}
    />
  );
}

// ── flattenConnection ────────────────────────────────────────────────────

export function flattenConnection<T>(
  connection:
    | {nodes?: T[] | null; edges?: Array<{node: T}> | null}
    | null
    | undefined,
): T[] {
  if (!connection) return [];
  if (connection.nodes) return [...connection.nodes];
  return connection.edges?.map((edge) => edge.node) ?? [];
}

// ── CartForm (Phase 4: bound to the /api/cart JSON protocol) ─────────────

export const CART_FORM_INPUT_NAME = 'cartFormInput';

export type CartFormInputs = {
  lines?: unknown;
  lineIds?: string[];
  discountCode?: string;
  discountCodes?: string[];
  giftCardCode?: string;
  giftCardCodes?: string[];
  buyerIdentity?: Record<string, unknown>;
  note?: string;
  attributes?: Array<{key: string; value: string}>;
  [key: string]: unknown;
};

export type CartFormProps = {
  action: string;
  inputs?: CartFormInputs;
  children?: React.ReactNode | ((fetcher: ReturnType<typeof useFetcher>) => React.ReactNode);
  route?: string;
  fetcherKey?: string;
};

const CART_ACTIONS = {
  LinesAdd: 'LinesAdd',
  LinesUpdate: 'LinesUpdate',
  LinesRemove: 'LinesRemove',
  DiscountCodesUpdate: 'DiscountCodesUpdate',
  GiftCardCodesAdd: 'GiftCardCodesAdd',
  GiftCardCodesRemove: 'GiftCardCodesRemove',
  BuyerIdentityUpdate: 'BuyerIdentityUpdate',
  NoteUpdate: 'NoteUpdate',
  AttributesUpdateInput: 'AttributesUpdateInput',
} as const;

// Actions with no /api/cart intent: they run through the bridge route's
// direct Storefront mutations instead (~/lib/cart-extensions).
const BRIDGE_ACTIONS: ReadonlySet<string> = new Set([
  CART_ACTIONS.GiftCardCodesAdd,
  CART_ACTIONS.GiftCardCodesRemove,
  CART_ACTIONS.BuyerIdentityUpdate,
]);

type CartRequestTranslation = {
  url: string;
  body: Record<string, unknown>;
};

type RawLine = {
  id?: string;
  merchandiseId?: string;
  quantity?: number;
  attributes?: Array<{key: string; value: string}>;
  sellingPlanId?: string;
  [key: string]: unknown;
};

function formString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Translates one classic CartForm action + inputs (+ the live form
 * fields) into exactly one field-based body for the cart server
 * handlers. See the section header for the mapping table.
 */
function translateCartAction(
  action: string,
  inputs: CartFormInputs,
  formData: FormData,
  route: string | undefined,
): CartRequestTranslation {
  const apiCartUrl = route && route.endsWith('/api/cart') ? route : '/api/cart';
  const bridgeUrl = '/api/cart-bridge';
  const rawLines = (Array.isArray(inputs.lines) ? inputs.lines : []) as RawLine[];

  switch (action) {
    case CART_ACTIONS.LinesAdd:
      return {
        url: apiCartUrl,
        body: {
          lines: rawLines.map((line) => ({
            merchandiseId: line.merchandiseId,
            quantity: line.quantity ?? 1,
            ...(line.attributes ? {attributes: line.attributes} : {}),
            ...(line.sellingPlanId ? {sellingPlanId: line.sellingPlanId} : {}),
          })),
        },
      };
    case CART_ACTIONS.LinesUpdate:
      return {
        url: apiCartUrl,
        body: {
          lines: rawLines.map((line) => ({
            id: line.id,
            quantity: line.quantity ?? 0,
            ...(line.attributes ? {attributes: line.attributes} : {}),
            ...(line.sellingPlanId ? {sellingPlanId: line.sellingPlanId} : {}),
          })),
        },
      };
    case CART_ACTIONS.LinesRemove: {
      // The runtime protocol has no lineIds field: a remove is a line
      // update to quantity 0.
      const lineIds =
        inputs.lineIds ??
        rawLines.map((line) => line.id).filter((id): id is string => Boolean(id));
      return {
        url: apiCartUrl,
        body: {lines: lineIds.map((id) => ({id, quantity: 0}))},
      };
    }
    case CART_ACTIONS.DiscountCodesUpdate: {
      const codes = [...(inputs.discountCodes ?? [])];
      const entered = formString(formData, 'discountCode');
      if (entered && !codes.includes(entered)) codes.push(entered);
      return {url: apiCartUrl, body: {discountCodes: codes}};
    }
    case CART_ACTIONS.NoteUpdate:
      return {
        url: apiCartUrl,
        body: {note: inputs.note ?? formString(formData, 'note') ?? ''},
      };
    case CART_ACTIONS.AttributesUpdateInput:
      return {url: apiCartUrl, body: {attributes: inputs.attributes ?? []}};
    case CART_ACTIONS.GiftCardCodesAdd: {
      const codes =
        inputs.giftCardCodes && inputs.giftCardCodes.length > 0
          ? inputs.giftCardCodes
          : [formString(formData, 'giftCardCode')].filter(
              (code): code is string => Boolean(code),
            );
      return {url: bridgeUrl, body: {action, giftCardCodes: codes}};
    }
    case CART_ACTIONS.GiftCardCodesRemove:
      // inputs.giftCardCodes carries the APPLIED gift card ids here
      // (the classic contract), which the bridge mutation expects.
      return {
        url: bridgeUrl,
        body: {action, giftCardCodes: inputs.giftCardCodes ?? []},
      };
    case CART_ACTIONS.BuyerIdentityUpdate:
      return {
        url: bridgeUrl,
        body: {action, buyerIdentity: inputs.buyerIdentity ?? {}},
      };
    default:
      return {url: apiCartUrl, body: {lines: rawLines}};
  }
}

function CartFormRoot({action, inputs, children, route, fetcherKey}: CartFormProps) {
  const fetcher = useFetcher({key: fetcherKey});
  const revalidator = useRevalidator();
  const [pending, setPending] = useState(false);
  const [lastData, setLastData] = useState<unknown>(undefined);
  const isBridgeAction = BRIDGE_ACTIONS.has(action);

  // The render-prop contract hands children a fetcher. Bridge actions
  // submit through the keyed fetcher itself (the bridge is a real route
  // action, so keyed fetchers elsewhere — e.g. CartSummary's gift-card
  // clearing effect — observe its state and data exactly as they did
  // with the classic CartForm). /api/cart is middleware-served, not a
  // route, so those submissions go through fetch() + revalidation and
  // the children receive a fetcher-shaped view of the local state.
  const fetcherForChildren = isBridgeAction
    ? fetcher
    : ({
        state: pending ? 'submitting' : 'idle',
        data: lastData,
      } as unknown as ReturnType<typeof useFetcher>);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const translation = translateCartAction(
      action,
      inputs ?? {},
      new FormData(event.currentTarget),
      route,
    );
    if (isBridgeAction) {
      void fetcher.submit(translation.body as never, {
        method: 'post',
        action: translation.url,
        encType: 'application/json',
      });
      return;
    }
    setPending(true);
    try {
      const response = await fetch(translation.url, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(translation.body),
      });
      setLastData(await response.json().catch(() => null));
    } catch {
      setLastData(null);
    } finally {
      setPending(false);
      void revalidator.revalidate();
    }
  }

  return (
    <form method="post" onSubmit={(event) => { void handleSubmit(event); }}>
      {typeof children === 'function' ? children(fetcherForChildren) : children}
    </form>
  );
}

function getFormInput(formData: FormData): {
  action: string | null;
  inputs: CartFormInputs;
} {
  const empty: CartFormInputs = {discountCodes: [], giftCardCodes: []};
  const raw = formData.get(CART_FORM_INPUT_NAME);
  if (typeof raw !== 'string') return {action: null, inputs: empty};
  try {
    const parsed = JSON.parse(raw) as {
      action?: string;
      inputs?: Partial<CartFormInputs>;
    };
    return {
      action: parsed.action ?? null,
      inputs: {
        ...parsed.inputs,
        discountCodes: parsed.inputs?.discountCodes ?? [],
        giftCardCodes: parsed.inputs?.giftCardCodes ?? [],
      },
    };
  } catch {
    return {action: null, inputs: empty};
  }
}

export const CartForm = Object.assign(CartFormRoot, {
  INPUT_NAME: CART_FORM_INPUT_NAME,
  ACTIONS: CART_ACTIONS,
  getFormInput,
});

// ── Optimistic cart (identity bridge) ────────────────────────────────────

export type OptimisticCart<T> = T & {isOptimistic?: boolean};
export type OptimisticCartLine<CartType> =
  CartType extends {lines: {nodes: Array<infer Line>}}
    ? Line & {isOptimistic?: boolean}
    : never;
export type OptimisticCartLineInput = CartLineInput & {
  selectedVariant?: object | null;
};

export function useOptimisticCart<T>(cart: T): T {
  return cart;
}

export type CartQueryDataReturn = {
  cart: CartApiQueryFragment;
  errors?: Array<{message: string; code?: string; field?: string[]}> | null;
  warnings?: Array<{message: string; code?: string}> | null;
};

// ── Analytics (inert bridge — TODO Phase 4) ──────────────────────────────

const NullView = (_props: Record<string, unknown>) => null;

export const Analytics = {
  Provider: ({children}: {children?: React.ReactNode}) => <>{children}</>,
  ProductView: NullView,
  CollectionView: NullView,
  SearchView: NullView,
  CartView: NullView,
  PageView: NullView,
};

export type AnalyticsContextValue = {
  publish: (eventName: string, data?: Record<string, unknown>) => void;
  subscribe: (
    eventName: string,
    callback: (data: unknown) => void,
  ) => () => void;
  canTrack: () => boolean;
  shop?: {id?: string} | null;
  cart?: CartApiQueryFragment | null;
  prevCart?: CartApiQueryFragment | null;
  customData?: Record<string, unknown>;
};

export function useAnalytics(): AnalyticsContextValue {
  return {
    publish: () => {},
    subscribe: () => () => {},
    canTrack: () => false,
    shop: undefined,
    cart: undefined,
    prevCart: undefined,
    customData: undefined,
  };
}

// ── Product option helpers (local ports of the classic helpers) ─────────
//
// Hydrogen 2026.10 removed getProductOptions,
// getAdjacentAndFirstAvailableVariants, useOptimisticVariant, and
// useSelectedOptionInUrlParam. These are faithful local ports of the
// classic semantics over the schema Product type:
//   • getProductOptions maps each option value to the variant data the
//     product form renders (uri query, selected/available/exists flags).
//   • useOptimisticVariant returns the primary variant in Phase 1 —
//     TODO(Phase 2): optimistic variant state returns with the cart
//     server handlers, as in repo 06's product store.
//   • useSelectedOptionInUrlParam writes the selected options into the
//     URL search params (replace, no navigation) only when the URL has
//     no search params yet — the classic behavior.

export type MappedProductOptions = {
  name: string;
  optionValues: Array<{
    name: string;
    handle: string;
    variantUriQuery: string;
    selected: boolean;
    available: boolean;
    exists: boolean;
    isDifferentProduct: boolean;
    firstSelectableVariant: ProductVariant | null;
    swatch?: ProductOptionValueSwatch | null;
  }>;
};

export function getAdjacentAndFirstAvailableVariants(
  product: Product,
): ProductVariant[] {
  const variants: ProductVariant[] = [];
  const seen = new Set<string>();
  for (const variant of [
    ...(product.adjacentVariants ?? []),
    product.selectedOrFirstAvailableVariant,
  ]) {
    if (variant && !seen.has(variant.id)) {
      seen.add(variant.id);
      variants.push(variant);
    }
  }
  return variants;
}

export function getProductOptions(product: Product): MappedProductOptions[] {
  const selectedVariant = product.selectedOrFirstAvailableVariant;
  const adjacent = product.adjacentVariants ?? [];
  return (product.options ?? []).map((option) => ({
    name: option.name,
    optionValues: option.optionValues.map((value) => {
      const firstSelectableVariant = value.firstSelectableVariant ?? null;
      const isDifferentProduct = Boolean(
        firstSelectableVariant &&
          firstSelectableVariant.product.handle !== product.handle,
      );
      const variantUriQuery = firstSelectableVariant
        ? `?${firstSelectableVariant.selectedOptions
            .map(
              (o) =>
                `${encodeURIComponent(o.name)}=${encodeURIComponent(o.value)}`,
            )
            .join('&')}`
        : '';
      const selected = Boolean(
        selectedVariant?.selectedOptions.some(
          (o) => o.name === option.name && o.value === value.name,
        ),
      );
      const exists =
        Boolean(firstSelectableVariant) ||
        adjacent.some((variant) =>
          variant.selectedOptions.some(
            (o) => o.name === option.name && o.value === value.name,
          ),
        );
      return {
        name: value.name,
        handle: firstSelectableVariant?.product.handle ?? product.handle,
        variantUriQuery,
        selected,
        available: firstSelectableVariant?.availableForSale ?? false,
        exists,
        isDifferentProduct,
        firstSelectableVariant,
        swatch: value.swatch ?? null,
      };
    }),
  }));
}

export function useOptimisticVariant(
  primaryVariant: ProductVariant,
  _adjacentVariants?: ProductVariant[],
): ProductVariant {
  return primaryVariant;
}

export function useSelectedOptionInUrlParam(
  selectedOptions: Array<{name: string; value: string}>,
): void {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paramsString = searchParams.toString();

  useEffect(() => {
    if (paramsString) return;
    const next = new URLSearchParams();
    for (const {name, value} of selectedOptions) {
      next.set(name, value);
    }
    if (next.toString()) {
      void navigate(
        {search: `?${next.toString()}`},
        {replace: true, preventScrollReset: true},
      );
    }
  }, [paramsString, navigate, selectedOptions]);
}
