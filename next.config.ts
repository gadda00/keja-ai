import type { NextConfig } from "next";

/**
 * Keja AI — Next.js configuration.
 *
 * Two build targets:
 *  - Sandbox/dev (default): standard Next.js output.
 *  - Static export (NEXT_STATIC=1): `next build` emits `out/` — a fully
 *    static SPA bundle that serves identically on Vercel (keja.app CDN),
 *    GitHub Pages mirrors and inside the Capacitor Android/iOS shells.
 *    The app is 100% client-side (hash routing + localStorage), so static
 *    export loses nothing today and keeps the backend upgrade path open.
 */
const isStatic = process.env.NEXT_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  // Quality gates are real gates (audit F-18 / P1-1): the build fails on
  // type errors, and React StrictMode surfaces effect bugs in dev.
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
};

export default nextConfig;
