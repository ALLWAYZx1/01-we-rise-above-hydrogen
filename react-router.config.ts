import type {Config} from '@react-router/dev/config';

/**
 * Vercel runtime configuration.
 *
 * Do not use Shopify's Hydrogen preset here: it targets the Oxygen worker
 * runtime, while this project is deployed as a Vercel React Router app.
 */
export default {
  ssr: true,
} satisfies Config;
