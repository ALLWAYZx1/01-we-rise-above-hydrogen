import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {type CartViewPayload} from '@shopify/hydrogen';
import {useOptimisticCart} from '~/lib/legacy-components';
import {useAnalytics} from '~/lib/analytics';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import wraLogo from '~/assets/we-rise-above-logo.png';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="header">
      <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
        {/* ALLWAYZ logo lockup (2026-11-20): black line art on
            transparency, rendered in brand gold through a CSS mask
            (see .header-logo in app.css). Shop name stays for
            screen readers. */}
        <span
          className="header-logo"
          aria-hidden="true"
          style={{
            WebkitMaskImage: `url(${wraLogo})`,
            maskImage: `url(${wraLogo})`,
          }}
        />
        <strong className="sr-only">{shop.name}</strong>
      </NavLink>
      {/* Center zone (2026-11-27 seasoning pass, ALLWAYZ's screenshots):
          the header is a 1fr / auto / 1fr grid, so this cluster sits at
          the true center of the bar. The account control rides in it —
          on mobile the menu hides and the account icon is left standing
          alone at center. */}
      <div className="header-center">
        <HeaderMenu
          menu={menu}
          viewport="desktop"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
        <AccountLink isLoggedIn={isLoggedIn} />
      </div>
      <HeaderCtas cart={cart} />
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const className = `header-menu-${viewport}`;
  const {close} = useAside();

  // ONE NAV (2026-11-25, ALLWAYZ's order): the header renders ONLY the
  // Shopify main-menu. The hardcoded "category shortcuts" row that used
  // to render above it is gone — it duplicated menu entries and two of
  // its links were dead (/collections/new and /collections/sale 404;
  // sidekick audit 2026-11-25, owner's screenshots same day). Links are
  // controlled from the Shopify admin now, nowhere else.
  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink end onClick={close} prefetch="intent" style={activeLinkStyle} to="/">
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
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

// Decluttered CTAs (2026-11-27 seasoning pass): the right cluster used
// to spell out "Sign in / Search / Cart N" as text, crowding the bar
// next to the menu. The three controls are icons now; the words live
// in aria-labels and screen-reader text, and the cart keeps its count
// as a small gold numeral (cosmic.css already styles spans in here).
function HeaderCtas({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <SearchToggle />
      <CartToggle cart={cart} />
    </nav>
  );
}

function AccountLink({isLoggedIn}: Pick<HeaderProps, 'isLoggedIn'>) {
  return (
    <NavLink
      prefetch="intent"
      to="/account"
      style={activeLinkStyle}
      className="header-account-link"
    >
      <Suspense
        fallback={
          <>
            <AccountIcon />
            <span className="sr-only">Sign in</span>
          </>
        }
      >
        <Await
          resolve={isLoggedIn}
          errorElement={
            <>
              <AccountIcon />
              <span className="sr-only">Sign in</span>
            </>
          }
        >
          {(isLoggedIn) => (
            <>
              <AccountIcon />
              <span className="sr-only">{isLoggedIn ? 'Account' : 'Sign in'}</span>
            </>
          )}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset header-icon-button"
      onClick={() => open('mobile')}
      aria-label="Open menu"
    >
      <MenuIcon />
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button
      className="reset header-icon-button"
      onClick={() => open('search')}
      aria-label="Search"
    >
      <SearchIcon />
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      className="header-cart-link"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
      aria-label={`Cart (${count} items)`}
    >
      <BagIcon />
      <span className="header-cart-count" aria-hidden="true">
        {count}
      </span>
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

function AccountIcon() {
  return (
    <svg
      className="header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 19.4c1.3-3.2 4-4.8 7.2-4.8s5.9 1.6 7.2 4.8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      className="header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5.5 8h13l-1.1 11a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8L5.5 8Z" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      className="header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
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
    color: isPending ? 'grey' : undefined,
  };
}
