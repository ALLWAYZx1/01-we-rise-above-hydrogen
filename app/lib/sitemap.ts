/**
 * ─────────────────────────────────────────────────────────────────────────
 * PHASE 1 STUB — the sitemap port is Phase 3, Batch D.
 *
 * The classic `getSitemap` / `getSitemapIndex` helpers were removed in
 * Hydrogen 2026.10. Repo 06 rebuilt them locally on the Storefront API
 * `sitemap` field (pagesCount index + resources pages); WRA's port must
 * additionally restore locale alternates because WRA keeps its
 * ($locale) route prefixes (scope doc, Risk 5). Until Batch D lands,
 * these functions throw a clear error so the routes fail loudly instead
 * of silently serving an empty sitemap.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface SitemapIndexArgs {
  storefront: unknown;
  request: Request;
}

export interface SitemapArgs {
  storefront: unknown;
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

export async function getSitemapIndex(
  _args: SitemapIndexArgs,
): Promise<Response> {
  throw new Error(
    'getSitemapIndex is not ported yet — Phase 3 Batch D (sitemap).',
  );
}

export async function getSitemap(_args: SitemapArgs): Promise<Response> {
  throw new Error('getSitemap is not ported yet — Phase 3 Batch D (sitemap).');
}
