import {Await, Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';

import pageStyles from '~/styles/daylight-pages.css?url';

export function links() { return [{rel: 'stylesheet', href: pageStyles}]; }

export const meta: Route.MetaFunction = () => [
  {title: 'WE RISE ABOVE | NO FINAL FORM'},
  {name: 'description', content: 'Streetwear for the ones still becoming. NO FINAL FORM.'},
];

export async function loader({context}: Route.LoaderArgs) {
  const [collections, products] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTIONS_QUERY),
    context.storefront.query(RECOMMENDED_PRODUCTS_QUERY).catch((error: Error) => {
      console.error('Homepage product rail failed to load', error);
      return null;
    }),
  ]);
  return {
    collections: collections.collections.nodes,
    products: products ? Promise.resolve(products) : Promise.resolve(null),
  };
}

export default function Homepage() {
  const {collections, products} = useLoaderData<typeof loader>();
  return (
    <main className="daylight-home">
      <section className="daylight-hero" aria-labelledby="home-title">
        <div className="daylight-astar" aria-hidden="true">✦</div>
        <img className="wra-hero-emblem" src="https://cdn.shopify.com/s/files/1/1002/6896/6179/files/Luminous_Gold_P_Emblem.png?v=1792758842" alt="We Rise Above emblem" width="112" height="112" />
        <p className="daylight-eyebrow">WE RISE ABOVE</p>
        <h1 id="home-title">NO FINAL <span>FORM.</span></h1>
        <p className="daylight-hero-copy">Built under pressure. Still becoming. Every day is another chance to rise.</p>
        <div className="daylight-actions">
          <Link className="daylight-button" to="/collections/all">Shop the collection</Link>
          <Link className="daylight-text-link" to="/pages/about">Our story <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="daylight-section" aria-labelledby="collections-title">
        <div className="daylight-section-heading">
          <div><p className="daylight-eyebrow">Find your frequency</p><h2 id="collections-title">Explore collections</h2></div>
          <Link className="daylight-text-link" to="/collections">View all <span aria-hidden="true">↗</span></Link>
        </div>
        {collections.length ? (
          <div className="daylight-collection-grid">
            {collections.map((collection: any) => (
              <Link className="daylight-collection-card" to={`/collections/${collection.handle}`} key={collection.id}>
                {collection.image ? <Image data={collection.image} alt={collection.image.altText || collection.title} sizes="(min-width: 760px) 33vw, 100vw" /> : <div className="daylight-image-fallback" aria-hidden="true">✦</div>}
                <span>{collection.title}</span><span className="daylight-card-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        ) : <p className="daylight-empty">New collections are on the way. Keep rising.</p>}
      </section>

      <section className="daylight-duality" aria-labelledby="duality-title">
        <div className="daylight-duality-art" aria-hidden="true">
          <span className="daylight-duality-halo" />
          <span className="daylight-duality-letter daylight-duality-angel">A</span>
          <span className="daylight-duality-spark">✦</span>
          <span className="daylight-duality-letter daylight-duality-demon">D</span>
          <span className="daylight-duality-art-label">LIGHT / SHADOW / SELF</span>
        </div>
        <div className="daylight-duality-copy">
          <p className="daylight-eyebrow">THE DUALITY EDIT / 001</p>
          <h2 id="duality-title">ANGELS <span>&amp; DEMONS.</span></h2>
          <p>Two forces. One identity. The tension between who you were, who you are, and who you choose to become. Wear every side without apology.</p>
          <Link className="daylight-button" to="/collections/all">Explore the edit <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="daylight-duality-index" aria-hidden="true">NO HALVES.<br />NO APOLOGIES.<br />ALL OF YOU.</div>
      </section>

      <section className="daylight-section" aria-labelledby="featured-title">
        <div className="daylight-section-heading">
          <div><p className="daylight-eyebrow">Made to move with you</p><h2 id="featured-title">BUILT UNDER PRESSURE</h2></div>
          <Link className="daylight-text-link" to="/collections/all">Shop all <span aria-hidden="true">↗</span></Link>
        </div>
        <Suspense fallback={<p className="daylight-empty">Loading the latest from the collection…</p>}>
          <Await resolve={products}>
            {(response) => response?.products.nodes.length ? (
              <div className="daylight-product-rail">
                {response.products.nodes.map((product) => <ProductItem key={product.id} product={product} />)}
              </div>
            ) : <p className="daylight-empty">The next release is taking shape. Check back soon.</p>}
          </Await>
        </Suspense>
      </section>

      <section className="daylight-values" aria-label="We Rise Above values">
        {['FAITH', 'DISCIPLINE', 'HARD WORK', 'NEVER SETTLE', 'KEEP RISING', 'STAY TRUE'].map((value) => <span key={value}>{value}</span>)}
      </section>

    </main>
  );
}

const FEATURED_COLLECTIONS_QUERY = `#graphql
  query DaylightFeaturedCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 3, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        image { id url altText width height }
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  query DaylightRecommendedProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        id title handle
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
