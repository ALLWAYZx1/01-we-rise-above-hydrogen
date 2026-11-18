/**
 * Shared prop types for the ported Forward sections.
 *
 * These are written locally against the real Shopify Storefront API shapes
 * (Hydrogen 2026.4.7). Forward's custom Product / StorefrontImage /
 * colorway model is NOT used anywhere in this folder.
 */
import type {Image as StorefrontApiImage} from '@shopify/hydrogen/storefront-api-types';

/** The subset of the Storefront API Image object the sections render. */
export type SectionImage = Pick<
  StorefrontApiImage,
  'url' | 'altText' | 'width' | 'height'
> & {
  id?: string | null;
};

/** A call-to-action rendered as a React Router link. */
export interface SectionCta {
  label: string;
  href: string;
}

/**
 * WRA palette — RESKIN v1 LOCKED TOKENS (spec: GLOBAL TOKENS are law).
 * Five colors only; every other tone in the sections is an alpha of one
 * of these. The same values live as CSS custom properties in
 * `./wra-reskin.css` (`--wra-void`, `--wra-panel`, `--wra-gold`,
 * `--wra-champagne`, `--wra-ivory`), which is what the section markup
 * actually references. (Forward's design tokens — bg-ink, bg-signal,
 * grid-cols-split-90, … — are deliberately not used.)
 */
export const WRA = {
  void: '#0A0908',
  panel: '#12100D',
  gold: '#D4AF37',
  champagne: '#E8D5A3',
  ivory: '#F5EFE2',
  ivory80: 'rgba(245,239,226,0.8)',
  ivory70: 'rgba(245,239,226,0.7)',
  goldLine: 'rgba(212,175,55,0.45)',
} as const;
