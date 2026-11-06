import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return remixData(
    {customer: data.customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();

  const heading = customer?.firstName
    ? `Welcome, ${customer.firstName}`
    : 'Your account';

  return (
    <div className="account">
      <header className="account-heading">
        <p className="account-eyebrow">WE RISE ABOVE</p>
        <h1>{heading}</h1>
        <p className="account-intro">
          View your orders, manage your details, and keep your information up to date.
        </p>
      </header>

      <nav className="account-nav" aria-label="Account navigation">
        <NavLink
          to="/account/orders"
          className={({isActive}) =>
            isActive ? 'account-nav-link is-active' : 'account-nav-link'
          }
        >
          Orders
        </NavLink>
        <NavLink
          to="/account/profile"
          className={({isActive}) =>
            isActive ? 'account-nav-link is-active' : 'account-nav-link'
          }
        >
          Profile
        </NavLink>
        <NavLink
          to="/account/addresses"
          className={({isActive}) =>
            isActive ? 'account-nav-link is-active' : 'account-nav-link'
          }
        >
          Addresses
        </NavLink>
        <Logout />
      </nav>

      <section className="account-panel" aria-label="Account details">
        <Outlet context={{customer}} />
      </section>
    </div>
  );
}

function Logout() {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
      <button className="account-nav-link account-signout" type="submit">
        Sign out
      </button>
    </Form>
  );
}
