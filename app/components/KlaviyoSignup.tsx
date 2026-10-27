import {useState, type FormEvent} from 'react';

const KLAVIYO_COMPANY_ID = 'Tz6eYC';
const WELCOME_LIST_ID = 'YaXHFg';

type SignupState = 'idle' | 'sending' | 'done' | 'error';

/**
 * Email capture for the We Rise Above — Welcome List in Klaviyo.
 * Subscribing fires the Welcome Flow ("You're in. Here's 10% off.").
 * Uses Klaviyo's client subscription API — no third-party JS.
 */
export function KlaviyoSignup() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SignupState>('idle');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending' || state === 'done') return;
    setState('sending');
    try {
      const response = await fetch(
        `https://a.klaviyo.com/client/subscriptions/?company_id=${KLAVIYO_COMPANY_ID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            revision: '2024-10-15',
          },
          body: JSON.stringify({
            data: {
              type: 'subscription',
              attributes: {
                custom_source: 'Hydrogen storefront footer',
                profile: {
                  data: {
                    type: 'profile',
                    attributes: {email},
                  },
                },
              },
              relationships: {
                list: {
                  data: {type: 'list', id: WELCOME_LIST_ID},
                },
              },
            },
          }),
        },
      );
      setState(response.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <section className="wra-signup" aria-labelledby="wra-signup-heading">
      <h3 id="wra-signup-heading">Join the rise</h3>
      <p>
        10% off your first order when you join the list. Drops, restocks, and
        pressure — no spam.
      </p>
      {state === 'done' ? (
        <p className="wra-signup-note" role="status">
          You&apos;re in. Check your inbox — your 10% is on its way.
        </p>
      ) : (
        <form
          className="wra-signup-form"
          onSubmit={(event) => void onSubmit(event)}
        >
          <label className="wra-signup-label" htmlFor="wra-signup-email">
            Email address
          </label>
          <input
            id="wra-signup-email"
            className="wra-signup-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="your@email.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            className="wra-signup-button"
            type="submit"
            disabled={state === 'sending'}
          >
            {state === 'sending' ? 'Joining…' : 'Get 10% off'}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className="wra-signup-note" role="alert">
          That didn&apos;t go through — try again in a moment.
        </p>
      )}
    </section>
  );
}
