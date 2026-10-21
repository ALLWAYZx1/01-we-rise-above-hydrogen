// GENERATED from api/index.ts by scripts/build-vercel-handler.mjs — do not edit by hand.

// api/index.ts
import dns from "node:dns";
import * as serverBuild from "../dist/server/index.js";
import {
  createRequestHandler,
  createHydrogenContext,
  InMemoryCache,
  storefrontRedirect
} from "@shopify/hydrogen";

// app/lib/session.ts
import {
  createCookieSessionStorage
} from "react-router";
var AppSession = class {
  isPending = false;
  #sessionStorage;
  #session;
  constructor(sessionStorage, session) {
    this.#sessionStorage = sessionStorage;
    this.#session = session;
  }
  static async init(request, secrets) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: "session",
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets
      }
    });
    const session = await storage.getSession(request.headers.get("Cookie")).catch(() => storage.getSession());
    return new this(storage, session);
  }
  get has() {
    return this.#session.has;
  }
  get get() {
    return this.#session.get;
  }
  get flash() {
    return this.#session.flash;
  }
  get unset() {
    this.isPending = true;
    return this.#session.unset;
  }
  get set() {
    this.isPending = true;
    return this.#session.set;
  }
  destroy() {
    return this.#sessionStorage.destroySession(this.#session);
  }
  commit() {
    this.isPending = false;
    return this.#sessionStorage.commitSession(this.#session);
  }
};

// app/lib/fragments.ts
var CART_QUERY_FRAGMENT = `#graphql
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
`;
var MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
`;
var HEADER_QUERY = `#graphql
  fragment Shop on Shop {
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
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      ...Shop
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
`;
var FOOTER_QUERY = `#graphql
  query Footer(
    $country: CountryCode
    $footerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
`;

// api/index.ts
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
}
var cache = new InMemoryCache();
function safeWaitUntil(promise) {
  Promise.resolve(promise).catch(() => {
  });
}
function getEnv() {
  return {
    SESSION_SECRET: process.env.SESSION_SECRET,
    PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN,
    PUBLIC_STOREFRONT_API_TOKEN: process.env.PUBLIC_STOREFRONT_API_TOKEN,
    PRIVATE_STOREFRONT_API_TOKEN: process.env.PRIVATE_STOREFRONT_API_TOKEN,
    PUBLIC_CHECKOUT_DOMAIN: process.env.PUBLIC_CHECKOUT_DOMAIN,
    PUBLIC_STOREFRONT_ID: process.env.PUBLIC_STOREFRONT_ID,
    SHOP_ID: process.env.SHOP_ID
  };
}
async function handler(request) {
  const t0 = Date.now();
  const mark = (phase) => console.log(`[wra-handler] ${phase} +${Date.now() - t0}ms`);
  try {
    mark("enter");
    const env = getEnv();
    if (!env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET environment variable is not set");
    }
    const session = await AppSession.init(request, [env.SESSION_SECRET]);
    mark("session");
    const hydrogenContext = createHydrogenContext({
      env,
      request,
      cache,
      waitUntil: safeWaitUntil,
      session,
      i18n: { language: "EN", country: "US" },
      cart: {
        queryFragment: CART_QUERY_FRAGMENT
      }
    });
    mark("context");
    const handleRequest = createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext
    });
    const response = await Promise.race([
      handleRequest(request),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("handler watchdog: 25s")), 25e3)
      )
    ]);
    mark("handled");
    if (hydrogenContext.session.isPending) {
      response.headers.set(
        "Set-Cookie",
        await hydrogenContext.session.commit()
      );
    }
    if (response.status === 404) {
      return storefrontRedirect({
        request,
        response,
        storefront: hydrogenContext.storefront
      });
    }
    return response;
  } catch (error) {
    console.error(error);
    return new Response("An unexpected error occurred", { status: 500 });
  }
}
export {
  handler as default
};
