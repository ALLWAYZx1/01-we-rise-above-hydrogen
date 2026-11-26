import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';

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
            <div className="footer-inner">
              {/* DENSITY SPEC — the footer is a brand destination,
                  not an empty band: brand block, dense nav grid,
                  and the store's real service facts. */}
              <div className="footer-brand">
                <p className="footer-brand-name">We Rise Above</p>
                <p className="footer-brand-line">
                  Faith. Discipline. Hard work. Keep rising.{' '}
                  <strong>No final form.</strong>
                </p>
              </div>
              <FooterMenu
                menu={footer?.menu ?? null}
                primaryDomainUrl={
                  header.shop.primaryDomain?.url ?? publicStoreDomain
                }
                publicStoreDomain={publicStoreDomain}
              />
              <p className="footer-facts">
                <span>✦ Printed to order</span>
                <span>✦ Ships from the USA</span>
                <span>✦ Secure Shopify checkout</span>
                <span>✦ RISE10 — 10% off your first order</span>
              </p>
            </div>
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
  menu: FooterQuery['menu'] | null;
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  // The admin footer menu carries no policy links, and the old parent guard
  // made this fallback unreachable whenever any menu existed — so the four
  // policy pages were never linked from the footer. Always merge the policy
  // links in, deduped by URL; with no admin menu, the fallback is the menu.
  const baseItems = menu?.items ?? FALLBACK_FOOTER_MENU.items;
  const seenUrls = new Set(baseItems.map((item) => item.url));
  const items = [
    ...baseItems,
    ...FALLBACK_FOOTER_MENU.items.filter((item) => !seenUrls.has(item.url)),
  ];
  return (
    <nav className="footer-menu" role="navigation">
      {items.map((item) => {
        if (!item.url) return null;
        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        const isExternal = !url.startsWith('/');
        return isExternal ? (
          <a href={url} key={item.id} rel="noopener noreferrer" target="_blank">
            {item.title}
          </a>
        ) : (
          <NavLink
            end
            key={item.id}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'white',
  };
}
