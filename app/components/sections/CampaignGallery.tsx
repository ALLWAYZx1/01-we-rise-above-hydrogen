/**
 * CampaignGallery — ALLWAYZ campaign/editorial imagery (2026-11-20).
 *
 * Presentational only: optimized WebP derivatives of ALLWAYZ's own
 * campaign art, wired into the homepage flow inside the existing
 * COSMIC ENERGY structure. These are campaign moments, not product
 * photography — nothing here links to, or stands in for, a specific
 * purchasable product, and the sections carry no copy of their own.
 * Everything sits below the fold: lazy-loaded, with intrinsic
 * dimensions declared so each frame holds its space (no CLS).
 *
 * 2026-11-25: black Ferrari skyline frame removed on ALLWAYZ's order.
 */
import campaignMain from '~/assets/campaign-we-rise-above.webp';
import campaignBeanie from '~/assets/campaign-beanie-pedestal.webp';
import campaignSunset from '~/assets/campaign-ferrari-sunset.webp';

/** The main campaign moment — full-width, after the universe steps. */
export function CampaignFeature() {
  return (
    <section
      data-section="campaign-feature"
      className="px-4 py-8 md:px-8 md:py-10"
    >
      <figure className="wra-campaign-frame m-0 mx-auto max-w-[1400px]">
        <img
          src={campaignMain}
          alt="We Rise Above campaign — model in a black WRA hoodie, jacket and cargos in a gold-lit studio"
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </figure>
    </section>
  );
}

/**
 * Secondary campaign split: the beanie campaign card on one side;
 * on the other, the smaller sunset tile. The sunset tile is a small
 * source (656×432) — it stays at card scale, never full-bleed.
 */
export function CampaignSplit() {
  return (
    <section data-section="campaign-split" className="px-4 py-8 md:px-8">
      <div className="mx-auto grid max-w-[1400px] items-start gap-3 md:grid-cols-2 md:gap-4">
        <figure className="wra-campaign-frame m-0">
          <img
            src={campaignBeanie}
            alt="We Rise Above campaign — black beanie with gold embroidery on a gold pedestal among campaign boxes"
            width={1200}
            height={686}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </figure>
        <figure className="wra-campaign-frame m-0">
          <img
            src={campaignSunset}
            alt="We Rise Above campaign — model in the sunrise hoodie beside a red Ferrari at sunset"
            width={656}
            height={432}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </figure>
      </div>
    </section>
  );
}
