import type {
  ShopifyCountryCode,
  ShopifyLanguageCode,
} from '@shopify/hydrogen';

/**
 * Local replacement for the classic Hydrogen `I18nBase` type, which
 * Hydrogen 2026.10 no longer exports. Same shape: a Storefront API
 * language/country pair, typed with Hydrogen's own i18n code types so
 * the value satisfies `createShopifyRequestContext`'s legacy fixed-locale
 * input (`I18nConfig`).
 */
export interface I18nBase {
  language: ShopifyLanguageCode;
  country: ShopifyCountryCode;
}

export interface I18nLocale extends I18nBase {
  pathPrefix: string;
}

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  type I18nFromUrl = [I18nLocale['language'], I18nLocale['country']];

  let pathPrefix = '';
  let [language, country]: I18nFromUrl = ['EN', 'US'];

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-') as I18nFromUrl;
  }

  return {language, country, pathPrefix};
}
