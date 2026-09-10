"use client";

/**
 * Keja AI — application entry.
 *
 * The entire platform is a client-side SPA mounted on the single Next.js `/`
 * route (hash-based deep links, offline-capable, identical in the PWA and the
 * Capacitor Android/iOS shells). See src/lib/router.tsx.
 */

import dynamic from "next/dynamic";

const KejaApp = dynamic(() => import("@/components/shell/KejaApp"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img src="/favicon.svg" alt="Keja AI" className="h-14 w-14" />
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Keja AI
      </p>
    </div>
  ),
});

export default function Page() {
  return <KejaApp />;
}
