/**
 * Bundle the Node HTTP adapter used by server.mjs.
 * The generated Hydrogen server build remains an external runtime import.
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
    js: '// GENERATED from api/index.ts by scripts/build-node-handler.mjs — do not edit by hand.',
  },
});

console.log('api/handler.js written');
