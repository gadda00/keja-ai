import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Keja.ai — Capacitor native-shell configuration.
 *
 * The web app (Next.js static export → out/) runs inside a native Android + iOS shell:
 * full feature parity with the PWA, app-store presence, hardware back button,
 * and a keja.app deep-link scheme. The build flow:
 *
 *   NEXT_STATIC=1 next build   (static export → out/)
 *   npx cap sync               (copy out/ into both native projects)
 *   npx cap open android  (Android Studio)  ·  npx cap open ios (Xcode)
 */
const config: CapacitorConfig = {
  appId: 'com.chacadom.keja',
  appName: 'Keja AI',
  webDir: 'out',
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFFFF',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#FFFFFF',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
