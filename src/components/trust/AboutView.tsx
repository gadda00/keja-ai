'use client';
/** About — the company, the mission, the honesty standard. */
import { Building2, Globe, HeartHandshake, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SITE } from '@/config';
import { navigate } from '@/lib/router';

export default function AboutView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">About</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          Not another listing website
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Keja AI is a <strong className="text-foreground">{SITE.parent}</strong> venture building
          Africa&rsquo;s real-estate intelligence and trust infrastructure — a platform where a
          person can discover a property, verify it, understand its value, analyse its investment
          potential, obtain financing, complete a transaction, invest, and ultimately manage the
          asset, all through one intelligent ecosystem.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          &ldquo;Keja&rdquo; is Swahili for home. We chose the name deliberately: home is trust,
          and trust is the product. Kenya&rsquo;s property market runs on relationships and
          reputation — we are building the digital layer that makes both verifiable.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Target, title: 'The mission', text: 'Collapse the trust deficit in African real estate with verification, intelligence and transparency.' },
          { icon: ShieldCheck, title: 'The standard', text: 'FACT / ESTIMATE / ASSUMPTION labels on every claim. A public claims register. No pay-to-play trust.' },
          { icon: Globe, title: 'The ambition', text: 'From Kenya to the continent — trilingual today (EN/SW/FR), pan-African tomorrow.' },
        ].map((c) => (
          <div key={c.title} className="card-lift rounded-2xl border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <c.icon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h2 className="mt-3.5 text-[15px] font-bold">{c.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border bg-card p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight">
          <Building2 className="h-5 w-5 text-gold" aria-hidden /> Chacadom Investments
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Chacadom Investments is the parent company behind Keja AI — a Nairobi-based investment
          house with interests across real estate, technology and media. The Keja platform is its
          technology venture, built with the regulatory seriousness of a financial institution: the
          CMA sandbox application pack for the tokenization pilot, the risk-management plan and the
          wind-down provisions are published alongside the product, not hidden from it.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
          <span>{SITE.offices}</span>
          <span>Founded {SITE.founded}</span>
          <a href={SITE.parentSiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            chacadom.com →
          </a>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-gold/40 bg-gold-soft p-6">
        <div className="flex items-center gap-4">
          <HeartHandshake className="h-8 w-8 text-gold" aria-hidden />
          <div>
            <h2 className="text-base font-black text-gold-foreground">Join the journey</h2>
            <p className="text-sm text-gold-foreground/80">Partner, list, invest — or just ask a hard question.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-gold font-black text-gold-foreground hover:bg-gold/90" onClick={() => navigate('/partners')}>Partner with Keja</Button>
          <Button variant="outline" className="border-gold/50 font-bold" onClick={() => navigate('/ask')}>
            <Sparkles className="mr-1.5 h-4 w-4 text-gold" aria-hidden /> Ask Keja AI
          </Button>
        </div>
      </div>
    </div>
  );
}
