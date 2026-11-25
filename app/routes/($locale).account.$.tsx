import {redirect} from 'react-router';
import type {Route} from './+types/($locale).account.$';
import {legacyContext} from '~/lib/context';

// fallback wild card for all unauthenticated routes in account section
export async function loader({context}: Route.LoaderArgs) {
  await legacyContext(context).customerAccount.handleAuthStatus();

  return redirect('/account');
}
