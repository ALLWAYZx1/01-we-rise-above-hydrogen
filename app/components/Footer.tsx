import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {KlaviyoSignup} from '~/components/KlaviyoSignup';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
}

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="footer">
            <div className="footer-brand"><span>A★</span><strong>WE RISE ABOVE</strong><p>Faith. Discipline. Hard work. Keep rising.</p><small>NO FINAL FORM.</small></div>
            {footer?.menu && header.shop.primaryDomain?.url && (
              <FooterMenu
                menu={footer.menu}
                primaryDomainUrl={header.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
              />
            )}
            <KlaviyoSignup />
            <FooterLegal />
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: NonNullable<FooterQuery['menu']>;
  primaryDomainUrl: string;
  publicStoreDomain: string;
}) {
  return (
    <nav className="footer-menu" role="navigation">
      {menu.items.map((item) => {
        if (!item.url) return null;
        const isInternal =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl);
        if (isInternal) {
          return (
            <NavLink
              end
              key={item.id}
              prefetch="intent"
              to={new URL(item.url).pathname}
            >
              {item.title}
            </NavLink>
          );
        }
        return (
          <a
            href={item.url}
            key={item.id}
            rel="noopener noreferrer"
            target="_blank"
          >
            {item.title}
          </a>
        );
      })}
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
