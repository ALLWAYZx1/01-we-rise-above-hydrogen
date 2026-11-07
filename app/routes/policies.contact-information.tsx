import {redirect} from 'react-router';

/**
 * Shopify's public contact page is the source of truth for the contact form
 * and published support address. Keep the legacy policy URL usable without
 * duplicating or inventing business identity details.
 */
export async function loader() {
  throw redirect('/pages/contact', {status: 301});
}

export default function ContactInformationRedirect() {
  return null;
}
