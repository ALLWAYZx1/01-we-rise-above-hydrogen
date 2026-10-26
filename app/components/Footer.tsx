import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {KlaviyoSignup} from '~/components/KlaviyoSignup';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

export function Footer({footer: footerPromise, header}: FooterProps) {
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {() => (
          <footer className="footer">
            <KlaviyoSignup />
            <FooterNav shopName={header.shop.name} />
            <FooterLegal />
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

/**
 * Grouped footer navigation. Rendered statically (not from the deferred
 * Shopify menu query) so the links are always present, and styled by the
 * .footer-nav rules in daylight.css — no inline `color: inherit`, which
 * previously resolved to the body's dark ink on the dark footer and made
 * the old menu links invisible.
 */
function FooterNav({shopName}: {shopName: string}) {
  return (
    <nav className="footer-nav" aria-label="Footer">
      <div className="footer-nav-brand">
        <strong>{shopName}</strong>
        <p>Pressure builds. We rise. No final form.</p>
      </div>
      <div className="footer-nav-group">
        <h3>Shop</h3>
        <NavLink prefetch="intent" to="/collections/all">
          Shop All
        </NavLink>
        <NavLink
          prefetch="intent"
          to="/collections/all?sort_by=created-descending"
        >
          New Arrivals
        </NavLink>
        <NavLink prefetch="intent" to="/collections">
          Shop by Category
        </NavLink>
      </div>
      <div className="footer-nav-group">
        <h3>Company</h3>
        <NavLink prefetch="intent" to="/pages/about">
          Our Story
        </NavLink>
        <NavLink prefetch="intent" to="/pages/faq">
          FAQ
        </NavLink>
        <NavLink prefetch="intent" to="/pages/contact">
          Contact
        </NavLink>
      </div>
      <div className="footer-nav-group">
        <h3>Account</h3>
        <NavLink prefetch="intent" to="/account">
          Account
        </NavLink>
        <NavLink prefetch="intent" to="/account/orders">
          Orders
        </NavLink>
      </div>
    </nav>
  );
}

function FooterLegal() {
  return (
    <nav className="footer-menu footer-legal" aria-label="Policies">
      {LEGAL_LINKS.map((link) => (
        <NavLink key={link.to} prefetch="intent" to={link.to}>
          {link.title}
        </NavLink>
      ))}
    </nav>
  );
}

const LEGAL_LINKS = [
  {title: 'Privacy Policy', to: '/policies/privacy-policy'},
  {title: 'Refund Policy', to: '/policies/refund-policy'},
  {title: 'Shipping Policy', to: '/policies/shipping-policy'},
  {title: 'Terms of Service', to: '/policies/terms-of-service'},
  {title: 'Your Privacy Choices', to: '/pages/data-sharing-opt-out'},
];
