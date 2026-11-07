import {redirect} from 'react-router';
import type {Route} from './+types/$';

export async function loader({request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const {pathname, search} = url;

  // Preserve the legacy Shopify product-feed URL by sending crawlers and
  // integrations to the current Hydrogen sitemap until a dedicated feed exists.
  if (pathname === '/products.json') {
    throw redirect('/sitemap.xml', {status: 301});
  }

  // The French market URL prefix is no longer served. Keep the same English
  // path and query string instead of sending every old URL to the homepage.
  if (pathname === '/fr' || pathname.startsWith('/fr/')) {
    const englishPath = pathname.slice(3) || '/';
    throw redirect(`${englishPath}${search}`, {status: 301});
  }

  // Shopify's legacy split sitemaps are consolidated into Hydrogen's sitemap.
  if (
    (pathname.startsWith('/sitemap_') && pathname.endsWith('.xml')) ||
    pathname === '/sitemap_index.xml'
  ) {
    throw redirect('/sitemap.xml', {status: 301});
  }

  throw new Response(`${pathname} not found`, {
    status: 404,
  });
}

export default function CatchAllPage() {
  return (
    <main className="daylight-page">
      <section className="daylight-hero" aria-labelledby="not-found-title">
        <p className="daylight-eyebrow">WE RISE ABOVE · NO FINAL FORM</p>
        <div className="daylight-astar" aria-hidden="true">✦</div>
        <h1 id="not-found-title">YOU DRIFTED.</h1>
        <p className="daylight-hero-copy">This page is in another phase.</p>
        <div className="daylight-actions">
          <a className="daylight-button" href="/">Back home</a>
          <a className="daylight-text-link" href="/collections/hoodies">Shop hoodies</a>
        </div>
      </section>
    </main>
  );
}
