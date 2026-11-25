import {useEffect} from 'react';
import {
  useFetcher,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router';
import type {
  CartLineInput,
  PageInfo,
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
 *   • CartForm — REAL form contract (hidden `cartFormInput` JSON +
 *     ACTIONS + getFormInput, byte-compatible with the classic one) so
 *     the cart route's dispatch and every AddToCart/CartLine form keep
 *     working unchanged; the server side it posts to is Phase 2.
 *   • Pagination — server-rendered bridge: Previous/Next are real links
 *     carrying the direction/cursor params that ~/lib/pagination reads,
 *     matching repo 06's documented behavior change from the classic
 *     client-side component. isLoading is always false.
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

// ── CartForm ─────────────────────────────────────────────────────────────

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

function CartFormRoot({action, inputs, children, route, fetcherKey}: CartFormProps) {
  const fetcher = useFetcher({key: fetcherKey});
  return (
    <fetcher.Form action={route} method="post">
      <input
        type="hidden"
        name={CART_FORM_INPUT_NAME}
        value={JSON.stringify({action, inputs})}
      />
      {typeof children === 'function' ? children(fetcher) : children}
    </fetcher.Form>
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
  ACTIONS: {
    LinesAdd: 'LinesAdd',
    LinesUpdate: 'LinesUpdate',
    LinesRemove: 'LinesRemove',
    DiscountCodesUpdate: 'DiscountCodesUpdate',
    GiftCardCodesAdd: 'GiftCardCodesAdd',
    GiftCardCodesRemove: 'GiftCardCodesRemove',
    BuyerIdentityUpdate: 'BuyerIdentityUpdate',
    NoteUpdate: 'NoteUpdate',
    AttributesUpdateInput: 'AttributesUpdateInput',
  },
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

// ── Pagination (server-rendered bridge) ──────────────────────────────────

export type PaginationConnection<NodesType> = {
  nodes: NodesType[];
  pageInfo: PageInfo;
};

type PaginationLinkProps = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
  preventScrollReset?: boolean;
};

export type PaginationRenderArgs<NodesType> = {
  nodes: NodesType[];
  isLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  NextLink: React.ComponentType<PaginationLinkProps>;
  PreviousLink: React.ComponentType<PaginationLinkProps>;
  nextPageUrl: string;
  previousPageUrl: string;
  state: {pageInfo: PageInfo; nodes: NodesType[]};
};

export function Pagination<NodesType>({
  connection,
  children,
}: {
  connection: PaginationConnection<NodesType>;
  children: (args: PaginationRenderArgs<NodesType>) => React.ReactNode;
}) {
  const location = useLocation();
  const {pageInfo} = connection;

  const buildUrl = (
    direction: 'next' | 'previous',
    cursor: string | null | undefined,
  ) => {
    const params = new URLSearchParams(location.search);
    params.set('direction', direction);
    if (cursor) params.set('cursor', cursor);
    else params.delete('cursor');
    return `${location.pathname}?${params.toString()}`;
  };

  const nextPageUrl = buildUrl('next', pageInfo.endCursor);
  const previousPageUrl = buildUrl('previous', pageInfo.startCursor);

  const NextLink: React.ComponentType<PaginationLinkProps> = ({
    children: linkChildren,
    ...props
  }) =>
    pageInfo.hasNextPage ? (
      <Link to={nextPageUrl} {...props}>
        {linkChildren}
      </Link>
    ) : (
      <span {...props}>{linkChildren}</span>
    );

  const PreviousLink: React.ComponentType<PaginationLinkProps> = ({
    children: linkChildren,
    ...props
  }) =>
    pageInfo.hasPreviousPage ? (
      <Link to={previousPageUrl} {...props}>
        {linkChildren}
      </Link>
    ) : (
      <span {...props}>{linkChildren}</span>
    );

  return (
    <>
      {children({
        nodes: connection.nodes,
        isLoading: false,
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: pageInfo.hasPreviousPage,
        NextLink,
        PreviousLink,
        nextPageUrl,
        previousPageUrl,
        state: {pageInfo, nodes: connection.nodes},
      })}
    </>
  );
}

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
