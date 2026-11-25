import type {
  Customer,
  CustomerAddress,
  LineItem,
  Order,
} from '@shopify/hydrogen/customer-account-api-types';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PHASE 1 BRIDGE — hand-maintained replacements for the deleted codegen
 * output (`customer-accountapi.generated.d.ts`). tsconfig maps the bare
 * specifier `customer-accountapi.generated` to this module so the 4
 * importing account files compile unchanged. Same retirement plan as
 * ~/lib/storefrontapi-types (Phases 3–4, account batch first).
 *
 * `OrderQuery` is hand-shaped from the order route's reads: the schema
 * `Order` type's discount-application value union does not discriminate
 * on `__typename` the way the route's Extract<> guards require.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type CustomerFragment = Customer;
export type AddressFragment = CustomerAddress;
export type CustomerOrdersFragment = Customer;
export type OrderItemFragment = Order;
export type OrderLineItemFullFragment = LineItem;

export type OrderQuery = {
  order: {
    id: string;
    name: string;
    processedAt?: string | null;
    confirmationNumber?: string | null;
    lineItems: {nodes: OrderLineItemFullFragment[]};
    discountApplications: {
      nodes: Array<{
        value:
          | {__typename: 'MoneyV2'; amount: string; currencyCode: string}
          | {__typename: 'PricingPercentageValue'; percentage: number};
      }>;
    };
    fulfillments: {nodes: Array<{status: string}>};
    subtotal?: {amount: string; currencyCode: string} | null;
    totalTax?: {amount: string; currencyCode: string} | null;
    totalPrice?: {amount: string; currencyCode: string} | null;
    shippingAddress?: {
      name?: string | null;
      formatted?: string | null;
      formattedArea?: string | null;
    } | null;
    statusPageUrl?: string;
    [key: string]: unknown;
  } | null;
};
