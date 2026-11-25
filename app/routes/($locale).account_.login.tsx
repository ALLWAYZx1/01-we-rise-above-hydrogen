import type {Route} from './+types/($locale).account_.login';
import {legacyContext} from '~/lib/context';

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const acrValues = url.searchParams.get('acr_values') || undefined;
  const loginHint = url.searchParams.get('login_hint') || undefined;
  const loginHintMode = url.searchParams.get('login_hint_mode') || undefined;
  const locale = url.searchParams.get('locale') || undefined;

  return legacyContext(context).customerAccount.login({
    countryCode: legacyContext(context).storefront.i18n.country,
    acrValues,
    loginHint,
    loginHintMode,
    locale,
  });
}
