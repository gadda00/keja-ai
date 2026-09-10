'use client';
/** Ecosystem page (proposal §2 + §20) — the nine-product map and the long-term vision. */
import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, Building2, Coins, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ECOSYSTEM, PORTALS } from '@/lib/ecosystem';
import { Link, navigate } from '@/lib/router';
import { SITE } from '@/config';
import { cn } from '@/lib/utils';

export default function EcosystemView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-gold/50 font-bold text-gold-foreground">The Keja Ecosystem</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          Nine products. One intelligent platform.
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Keja is not a listing site with features bolted on. It is a connected ecosystem where
          discovery feeds verification, verification feeds analysis, analysis feeds financing —
          and every product compounds the value of the others.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ECOSYSTEM.map((p, i) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: Math.min(i * 0.04, 0.25) }}
          >
            <Link to={p.route} className="card-lift group flex h-full flex-col rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <p.icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="font-mono text-[10px] font-black text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold">{p.name}</h3>
              <p className="text-[11px] font-black uppercase tracking-widest text-gold">{p.tagline}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-bold text-primary">
                Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* portals */}
      <section className="mt-10">
        <h2 className="text-xl font-black tracking-tight">Stakeholder portals</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map((p) => (
            <Link key={p.route} to={p.route} className="card-lift rounded-2xl border bg-card p-5">
              <h3 className="text-[15px] font-bold">{p.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* the long-term vision §20 */}
      <section className="mt-12 rounded-3xl border bg-emerald-deep p-6 text-white sm:p-10">
        <h2 className="text-2xl font-black tracking-tight">The long-term vision</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
          The digital infrastructure connecting the entire real-estate lifecycle — {SITE.parent}&rsquo;s
          ambition for Keja to sit at the centre of African real estate.
        </p>
        <div className="mt-8 grid items-center gap-4 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <Building2 className="mx-auto h-8 w-8 text-gold" aria-hidden />
            <p className="mt-2 text-sm font-black">Property owner</p>
            <p className="mt-1 text-xs text-white/70">Discover · list · verify · manage</p>
          </div>
          <ArrowRight className="mx-auto hidden h-6 w-6 text-gold md:block" aria-hidden />
          <div className="rounded-2xl border border-gold/40 bg-gold/15 p-5 backdrop-blur-sm">
            <Sparkles className="mx-auto h-8 w-8 text-gold" aria-hidden />
            <p className="mt-2 text-sm font-black text-gold">Keja AI</p>
            <p className="mt-1 text-xs text-white/75">Verification · Intelligence · Finance · Investment · Transaction · Management</p>
          </div>
          <ArrowRight className="mx-auto hidden h-6 w-6 text-gold md:block" aria-hidden />
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <ShieldCheck className="mx-auto h-8 w-8 text-gold" aria-hidden />
            <p className="mt-2 text-sm font-black">Every stakeholder</p>
            <p className="mt-1 text-xs text-white/70">Buyer · investor · bank · developer · institution</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate('/tokenize')}
            className="rounded-xl bg-gold px-5 py-2.5 text-sm font-black text-gold-foreground transition-transform hover:scale-[1.03]"
          >
            <Coins className="mr-1.5 inline h-4 w-4" aria-hidden /> Try the tokenization trial
          </button>
          <button
            onClick={() => navigate('/partners')}
            className="rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            Partner with Keja
          </button>
        </div>
      </section>
    </div>
  );
}
