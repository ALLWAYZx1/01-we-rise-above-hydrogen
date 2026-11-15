import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

/**
 * Hydrogen's preset configures the app directory, SSR, and future flags.
 * The MiniOxygen Vite plugin in vite.config.ts provides the Oxygen Worker runtime.
 */
export default {
  presets: [hydrogenPreset()],
} satisfies Config;
