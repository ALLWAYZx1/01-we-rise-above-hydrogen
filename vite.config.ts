import {reactRouter} from '@react-router/dev/vite';
import {localHttps} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';

// Ported from the repo 06 shell (Hydrogen 2026.10 pattern), with WRA's
// tailwindcss() plugin kept from the classic config.
const oxygenPlugins = oxygen();
const enabled = process.env.npm_lifecycle_event === 'dev:https';
const httpsOptions = {enabled};

export default defineConfig({
  plugins: [tailwindcss(), localHttps(httpsOptions), ...oxygenPlugins, reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // Allow a strict Content-Security-Policy
    // without inlining assets as base64:
    assetsInlineLimit: 0,
  },
  environments: {
    ssr: {
      build: {
        // Build the Oxygen Worker entry, which wraps React Router's server
        // build, instead of React Router's default server build module.
        rolldownOptions: {input: './server.ts'},
      },
    },
  },
  ssr: {
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/server',
        'react-router > set-cookie-parser',
        'react-router > cookie',
        'react-router',
      ],
    },
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev'],
  },
});
