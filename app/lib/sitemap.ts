import type {LegacyStorefront} from '~/lib/context';

/**
 * Sitemap generation — Phase 3, Batch D port.
 *
 * The classic `getSitemap` / `getSitemapIndex` helpers were removed in
 * Hydrogen 2026.10. This is a local rebuild on the same Storefront API
 * `sitemap` field the classic helpers used (mechanics mirror repo 06's
 * port): the index reads each type's `pagesCount`, and each sitemap
 * file reads one `resources(page:)` page of {handle, updatedAt} items.
 *
 * WRA differences from repo 06's single-locale port, per the Phase 3
 * locale ruling (classic behavior wins):
 *   • The exported signatures keep the classic shapes the routes were
 *     written against ({storefront, request} / {storefront, request,
 *     params, locales, getLink}).
 *   • Locale alternates are restored: every URL entry carries one
 *     <xhtml:link rel="alternate"> per locale the route passes in,
 *     built through the route's own getLink.
 *   • Article resources link through the blogs prefix: the API returns
 *     article handles as `blogHandle/articleHandle`, and the app's
 *     article routes live under /blogs/ — so getLink is called with
 *     type 'blogs' for articles (repo 06 made the same call).
 *
 * Known parity items (Phase 5): the LIVE store's Shopify-hosted
 * sitemap index additionally has per-locale sub-sitemap sets
 * (/fr /es /de /ja) plus metaobject_pages and agentic_discovery sets.
 * The classic app served a single set with in-file locale alternates
 * and had no metaobject routes; that classic shape is what is
 * reproduced here.
 */

export interface SitemapIndexArgs {
  storefront: LegacyStorefront;
  request: Request;
}

export interface SitemapArgs {
  storefront: LegacyStorefront;
  request: Request;
  params: {type?: string; page?: string};
  locales?: string[];
  getLink: (args: {
    type: string;
    baseUrl: string;
    handle: string;
    locale?: string;
  }) => string;
}

const SITEMAP_TYPES = [
  'products',
  'collections',
  'pages',
  'blogs',
  'articles',
] as const;
type SitemapType = (typeof SITEMAP_TYPES)[number];

const SITEMAP_TYPE_ENUM: Record<
  SitemapType,
  'PRODUCT' | 'COLLECTION' | 'PAGE' | 'BLOG' | 'ARTICLE'
> = {
  products: 'PRODUCT',
  collections: 'COLLECTION',
  pages: 'PAGE',
  blogs: 'BLOG',
  articles: 'ARTICLE',
};

const SITEMAP_INDEX_QUERY = `#graphql
  query SitemapIndex {
    products: sitemap(type: PRODUCT) {
      pagesCount {
        count
      }
    }
    collections: sitemap(type: COLLECTION) {
      pagesCount {
        count
      }
    }
    pages: sitemap(type: PAGE) {
      pagesCount {
        count
      }
    }
    blogs: sitemap(type: BLOG) {
      pagesCount {
        count
      }
    }
    articles: sitemap(type: ARTICLE) {
      pagesCount {
        count
      }
    }
  }
`;

const SITEMAP_PAGE_QUERY = `#graphql
  query SitemapPage($page: Int!, $type: SitemapType!) {
    sitemap(type: $type) {
      resources(page: $page) {
        items {
          handle
          updatedAt
        }
      }
    }
  }
`;

type SitemapIndexData = Record<
  SitemapType,
  {pagesCount?: {count?: number} | null} | null
>;

type SitemapPageData = {
  sitemap?: {
    resources?: {
      items?: Array<{handle: string; updatedAt: string}> | null;
    } | null;
  } | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function getSitemapIndex({
  storefront,
  request,
}: SitemapIndexArgs): Promise<Response> {
  const data = await storefront.query<SitemapIndexData | null>(
    SITEMAP_INDEX_QUERY,
  );
  if (!data) {
    return new Response('Not found', {status: 404});
  }
  const baseUrl = new URL(request.url).origin;

  const sitemaps = SITEMAP_TYPES.flatMap((type) => {
    const pages = data[type]?.pagesCount?.count ?? 0;
    return Array.from(
      {length: pages},
      (_, index) =>
        `  <sitemap>\n    <loc>${baseUrl}/sitemap/${type}/${index + 1}.xml</loc>\n  </sitemap>`,
    );
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps.join('\n')}\n</sitemapindex>`;

  return new Response(body, {
    headers: {'Content-Type': 'application/xml'},
  });
}

export async function getSitemap({
  storefront,
  request,
  params,
  locales,
  getLink,
}: SitemapArgs): Promise<Response> {
  const type = params.type as SitemapType | undefined;
  const page = Number(params.page);
  if (
    !type ||
    !(SITEMAP_TYPES as readonly string[]).includes(type) ||
    !Number.isInteger(page) ||
    page < 1
  ) {
    return new Response('Not found', {status: 404});
  }
  const baseUrl = new URL(request.url).origin;

  const data = await storefront.query<SitemapPageData | null>(
    SITEMAP_PAGE_QUERY,
    {variables: {page, type: SITEMAP_TYPE_ENUM[type]}},
  );
  const items = data?.sitemap?.resources?.items ?? [];

  // Article handles arrive as `blogHandle/articleHandle` and the app's
  // article routes live under /blogs/, so articles link through the
  // blogs prefix.
  const linkType = type === 'articles' ? 'blogs' : type;
  const alternateLocales = locales ?? [];

  const urls =
    items.length > 0
      ? items.map((item) => {
          const alternates = alternateLocales
            .map(
              (locale) =>
                `    <xhtml:link rel="alternate" hreflang="${escapeXml(locale.toLowerCase())}" href="${escapeXml(getLink({type: linkType, baseUrl, handle: item.handle, locale}))}"/>`,
            )
            .join('\n');
          return [
            '  <url>',
            `    <loc>${escapeXml(getLink({type: linkType, baseUrl, handle: item.handle}))}</loc>`,
            `    <lastmod>${escapeXml(item.updatedAt)}</lastmod>`,
            '    <changefreq>weekly</changefreq>',
            ...(alternates ? [alternates] : []),
            '  </url>',
          ].join('\n');
        })
      : [`  <url>\n    <loc>${baseUrl}/</loc>\n  </url>`];

  const xhtmlNs =
    alternateLocales.length > 0
      ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"'
      : '';
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtmlNs}>\n${urls.join('\n')}\n</urlset>`;

  return new Response(body, {
    headers: {'Content-Type': 'application/xml'},
  });
}
