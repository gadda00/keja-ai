'use client';
/** 404 — honest not-found with working exits. */
import { Compass, Home, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';

export default function NotFoundView() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent">
        <Compass className="h-10 w-10 text-primary" aria-hidden />
      </div>
      <div>
        <p className="font-mono text-sm font-black text-gold">404 · KEJA-ROUTE-NOT-FOUND</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">This address doesn&rsquo;t exist</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The page you followed isn&rsquo;t part of the platform — it may have moved, or the link
          may be mistyped. Everything else is one tap away.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button className="font-bold" onClick={() => navigate('/')}>
          <Home className="mr-1.5 h-4 w-4" aria-hidden /> Home
        </Button>
        <Button variant="outline" className="font-bold" onClick={() => navigate('/properties')}>
          <Search className="mr-1.5 h-4 w-4" aria-hidden /> Properties
        </Button>
        <Button variant="outline" className="font-bold" onClick={() => navigate('/ask')}>
          <Sparkles className="mr-1.5 h-4 w-4 text-gold" aria-hidden /> Ask Keja AI
        </Button>
      </div>
    </div>
  );
}
