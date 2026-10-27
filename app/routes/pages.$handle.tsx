import {useLoaderData} from 'react-router';
import type {Route} from './+types/pages.$handle';
import pageStyles from '~/styles/daylight-pages.css?url';

export function links() { return [{rel: 'stylesheet', href: pageStyles}]; }
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `WE RISE ABOVE | ${data?.page.title ?? 'Our story'}`},
  {name: 'description', content: data?.page.seo?.description || 'The story behind WE RISE ABOVE. NO FINAL FORM.'},
];

export async function loader({context, request, params}: Route.LoaderArgs) {
  if (!params.handle) throw new Response('Page not found', {status: 404});
  const {page} = await context.storefront.query(PAGE_QUERY, {variables: {handle: params.handle}});
  if (!page) throw new Response('Page not found', {status: 404});
  redirectIfHandleIsLocalized(request, {handle: params.handle, data: page});
  return {page};
}

export default function Page() {
  const {page} = useLoaderData<typeof loader>();
  const about = ['about', 'our-story', 'brand'].includes(page.handle.toLowerCase());
  return (
    <main className="daylight-page">
      <header className="daylight-page-heading"><p className="daylight-eyebrow">WE RISE ABOVE</p><h1>{about ? 'NO FINAL FORM.' : page.title}</h1>{about ? <p className="daylight-page-lede">Pressure is part of the process. It does not get the final word.</p> : null}</header>
      <article className="daylight-page-content" dangerouslySetInnerHTML={{__html: page.body}} />
      {about ? <section className="daylight-page-values"><h2>Keep rising.</h2><p>FAITH · DISCIPLINE · HARD WORK · NEVER SETTLE · KEEP RISING · STAY TRUE.</p></section> : null}
    </main>
  );
}

const PAGE_QUERY = `#graphql
  query DaylightPage($language: LanguageCode, $country: CountryCode, $handle: String!)
    @inContext(language: $language, country: $country) {
    page(handle: $handle) { handle id title body seo { description title } }
  }
` as const;
