import {redirect} from 'react-router';
import type {Route} from './+types/($locale).account_.logout';
import {legacyContext} from '~/lib/context';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({context}: Route.ActionArgs) {
  return legacyContext(context).customerAccount.logout();
}
