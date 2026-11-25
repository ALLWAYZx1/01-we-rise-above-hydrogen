import type {Route} from './+types/($locale).[sitemap.xml]';
import {getSitemapIndex} from '~/lib/sitemap';
import {legacyContext} from '~/lib/context';

export async function loader({
  request,
  context,
}: Route.LoaderArgs) {
  const {storefront} = legacyContext(context);
  const response = await getSitemapIndex({
    storefront,
    request,
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
