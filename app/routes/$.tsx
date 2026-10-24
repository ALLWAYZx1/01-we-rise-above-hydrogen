import type {Route} from './+types/$';

export async function loader({request}: Route.LoaderArgs) {
  throw new Response(`${new URL(request.url).pathname} not found`, {
    status: 404,
  });
}

export default function CatchAllPage() {
  return (
    <main className="daylight-page">
      <section className="daylight-hero" aria-labelledby="not-found-title">
        <p className="daylight-eyebrow">WE RISE ABOVE · NO FINAL FORM</p>
        <div className="daylight-astar" aria-hidden="true">✦</div>
        <h1 id="not-found-title">YOU DRIFTED.</h1>
        <p className="daylight-hero-copy">This page is in another phase.</p>
        <div className="daylight-actions">
          <a className="daylight-button" href="/">Back home</a>
          <a className="daylight-text-link" href="/collections/hoodies">Shop hoodies</a>
        </div>
      </section>
    </main>
  );
}
