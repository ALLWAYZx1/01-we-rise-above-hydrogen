/**
 * `react-dom/server.browser` ships without bundled TypeScript
 * declarations in react-dom 18, and @types/react-dom only declares
 * `react-dom/server` (+ node/edge/bun variants). The Oxygen/workerd
 * server entry (app/entry.server.tsx) imports the browser build,
 * whose runtime API surface is the same web-stream API as
 * `react-dom/server`. Re-export those types so the import is typed
 * instead of implicitly `any` (CI TS7016).
 */
declare module 'react-dom/server.browser' {
  export * from 'react-dom/server';
}
