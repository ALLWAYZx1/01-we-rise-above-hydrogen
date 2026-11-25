import {gql, type StorefrontApi} from '@shopify/hydrogen';

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/cart
// Kept verbatim from the classic shell. Phase 2's cart server handlers
// compose their own query (library base fragment + the custom fragment
// in ~/lib/cart-handlers, which re-selects the classic top-level fields
// the base lacks: appliedGiftCards, buyerIdentity);
// this string remains the parity reference for the fields the classic
// cart query selected and is no longer executed.
export const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 {
    currencyCode
    amount
  }
  fragment CartLine on CartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        availableForSale
        compareAtPrice {
          ...Money
        }
        price {
          ...Money
        }
        requiresShipping
        title
        image {
          id
          url
          altText
          width
          height

        }
        product {
          handle
          title
          id
          vendor
        }
        selectedOptions {
          name
          value
        }
      }
    }
    parentRelationship {
      parent {
        id
      }
    }
  }
  fragment CartLineComponent on ComponentizableCartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        availableForSale
        compareAtPrice {
          ...Money
        }
        price {
          ...Money
        }
        requiresShipping
        title
        image {
          id
          url
          altText
          width
          height
        }
        product {
          handle
          title
          id
          vendor
        }
        selectedOptions {
          name
          value
        }
      }
    }
    lineComponents {
      ...CartLine
    }
  }
  fragment CartApiQuery on Cart {
    updatedAt
    id
    appliedGiftCards {
      id
      lastCharacters
      amountUsed {
        ...Money
      }
    }
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      nodes {
        ...CartLine
      }
      nodes {
        ...CartLineComponent
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
      totalDutyAmount {
        ...Money
      }
      totalTaxAmount {
        ...Money
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
      applicable
    }
  }
` as const;

// The menu selection is inlined into both queries (the official 2026.10
// starter inlines selections the same way) so ResultOf types stay plain,
// unmasked data for the Header/Footer components.
export const HEADER_QUERY = gql(`
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      id
      name
      description
      primaryDomain {
        url
      }
      brand {
        logo {
          image {
            url
          }
        }
      }
    }
    menu(handle: $headerMenuHandle) {
      id
      items {
        id
        resourceId
        tags
        title
        type
        url
        items {
          id
          resourceId
          tags
          title
          type
          url
        }
      }
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
    }
  }
`);

export const FOOTER_QUERY = gql(`
  query Footer(
    $country: CountryCode
    $footerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      id
      items {
        id
        resourceId
        tags
        title
        type
        url
        items {
          id
          resourceId
          tags
          title
          type
          url
        }
      }
    }
  }
`);

export type HeaderQuery = StorefrontApi.ResultOf<typeof HEADER_QUERY>;
export type FooterQuery = StorefrontApi.ResultOf<typeof FOOTER_QUERY>;
