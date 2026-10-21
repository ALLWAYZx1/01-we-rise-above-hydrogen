/**
 * Bundles the Vercel Node handler (api/index.ts) into a single
 * self-contained ESM file at api/handler.js.
 *
 * Why: Vercel's Node runtime cannot resolve the handler's local
 * TypeScript source imports (../app/lib/session, ../app/lib/fragments)
 * — the deployed function died with ERR_MODULE_NOT_FOUND for
 * '/var/task/app/lib/session'. Bundling inlines every local file.
 *
 * Packages stay external (resolved from node_modules at runtime) and
 * the generated Hydrogen server bundle stays external too — it is
 * produced by `npm run build` into dist/server and shipped via the
 * `includeFiles` entry in vercel.json.
 */
import {build} from 'esbuild';

await build({
  entryPoints: ['api/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: 'api/handler.js',
  packages: 'external',
  external: ['../dist/server/index.js'],
  banner: {
    js: '// GENERATED from api/index.ts by scripts/build-vercel-handler.mjs — do not edit by hand.',
  },
});

console.log('api/handler.js written');
