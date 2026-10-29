/**
 * PRESERVED Node.js server entry — NOT wired into the build.
 *
 * React Router only loads app/entry.server.tsx; this copy keeps the
 * pipeable-stream implementation from the deploy/vercel-node line for
 * reference (e.g. a future Node-only target using @react-router/node).
 * It imports PassThrough from node:stream, so it must never be bundled
 * into the Oxygen worker: the Oxygen deploy fails with
 *   No such module "node:stream" imported from "worker.mjs"
 * The live entry is app/entry.server.tsx (web streams, both targets).
 */

import {PassThrough} from 'node:stream';
import type {EntryContext} from 'react-router';
import {ServerRouter} from 'react-router';
import {createReadableStreamFromReadable} from '@react-router/node';
import {isbot} from 'isbot';
import type {RenderToPipeableStreamOptions} from 'react-dom/server';
import {renderToPipeableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get('user-agent');

    const {nonce, header, NonceProvider} = createContentSecurityPolicy({
      shop: {
        checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
        storeDomain: context.env.PUBLIC_STORE_DOMAIN,
      },
    });

    const readyOption: keyof RenderToPipeableStreamOptions =
      userAgent && isbot(userAgent) ? 'onAllReady' : 'onShellReady';

    const {pipe, abort} = renderToPipeableStream(
      <NonceProvider>
        <ServerRouter
          context={reactRouterContext}
          url={request.url}
          nonce={nonce}
        />
      </NonceProvider>,
      {
        nonce,
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');
          responseHeaders.set('Content-Security-Policy', header);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
