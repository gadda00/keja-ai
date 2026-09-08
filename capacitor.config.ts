import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Keja.ai — Capacitor native-shell configuration.
 *
 * The web app (Vite build → dist/) runs inside a native Android + iOS shell:
 * full feature parity with the PWA, app-store presence, hardware back button,
 * and a keja.app deep-link scheme. The build flow:
 *
 *   npm run build         (VITE_BASE=/ — see scripts.cap)
 *   npx cap sync          (copy dist/ into both native projects)
 *   npx cap open android  (Android Studio)  ·  npx cap open ios (Xcode)
 */
const config: CapacitorConfig = {
  appId: 'com.chacadom.keja',
  appName: 'Keja AI',
  webDir: 'dist',
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
