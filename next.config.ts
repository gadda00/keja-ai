import type { NextConfig } from "next";

/**
 * Keja AI — Next.js configuration.
 *
 * Single output contract (audit SEC-202): this app is a 100% client-side
 * static export (hash routing + localStorage persistence), so the build
 * ALWAYS emits `out/` — a fully static bundle that serves identically on
 * Vercel (keja.app CDN), GitHub Pages mirrors and inside the Capacitor
 * Android/iOS shells. There is no server runtime by design; the backend
 * upgrade path (Prisma schema + API seam) activates separately.
 *
 * History: this used to be gated behind NEXT_STATIC=1, which let a plain
 * `next build` produce server output that the old `build` script then tried
 * (and failed) to package as a standalone server — the "ambiguous hybrid"
 * the audit flagged. Static export is now unconditional.
 */
const nextConfig: NextConfig = {
  output: "export" as const,
  trailingSlash: true,
  images: { unoptimized: true },
  // Quality gates are real gates (audit F-18 / P1-1): the build fails on
  // type errors, and React StrictMode surfaces effect bugs in dev.
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
};

export default nextConfig;
