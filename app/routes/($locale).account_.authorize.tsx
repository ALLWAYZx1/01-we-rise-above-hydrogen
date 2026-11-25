import type {Route} from './+types/($locale).account_.authorize';
import {legacyContext} from '~/lib/context';

export async function loader({context}: Route.LoaderArgs) {
  return legacyContext(context).customerAccount.authorize();
}
