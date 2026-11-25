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
    // The Shopify CLI resolves this project's worker path through the
    // legacy top-level build view (build.outDir + the server build file
    // name). Left unset, outDir defaults to 'dist' and
    // `shopify hydrogen build`/`deploy` stat dist/index.js — a file the
    // React Router build never writes (it writes dist/server/index.js)
    // — and publish dies with ENOENT (verified 2026-11-25). The server
    // directory is therefore the top-level default, and each
    // environment below restates its own outDir explicitly so the
    // client bundle still lands in dist/client.
    outDir: 'dist/server',
  },
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
      },
    },
    ssr: {
      build: {
        outDir: 'dist/server',
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
