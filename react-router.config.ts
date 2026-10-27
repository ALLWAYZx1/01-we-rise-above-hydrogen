import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

/**
 * React Router 7.9.x Configuration for Hydrogen
 *
 * Same Hydrogen preset as the Oxygen line (it only sets app directory,
 * SSR, and future flags — the Oxygen worker output comes from the
 * mini-oxygen Vite plugin, which this branch does not load).
 */
export default {
  presets: [hydrogenPreset()],
} satisfies Config;
