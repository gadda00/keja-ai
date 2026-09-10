import type { NextConfig } from "next";

/**
 * Keja AI — Next.js configuration.
 *
 * Two build targets:
 *  - Sandbox/dev (default): standard Next.js output.
 *  - Static export (NEXT_STATIC=1): `next build` emits `out/` — a fully
 *    static SPA bundle that serves identically on Netlify (keja.app CDN),
 *    GitHub Pages mirrors and inside the Capacitor Android/iOS shells.
 *    The app is 100% client-side (hash routing + localStorage), so static
 *    export loses nothing today and keeps the backend upgrade path open.
 */
const isStatic = process.env.NEXT_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
