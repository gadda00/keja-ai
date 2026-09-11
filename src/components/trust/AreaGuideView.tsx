'use client';
/** Area guide — neighbourhood deep-dive joined with live inventory. */
import { ArrowLeft, MapPin, TrendingUp } from 'lucide-react';
import { srcsetFor, GALLERY_SIZES } from '@/lib/responsive-images';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NEIGHBORHOOD_GUIDES, getNeighborhoodGuide, guideInventoryCount } from '@/data/neighborhoods';
import { areaInsights } from '@/data/properties';
import { useAllProperties } from '@/lib/inventory';
import { PropertyCard } from '@/components/property/PropertyCard';
import { navigate } from '@/lib/router';

export default function AreaGuideView({ slug }: { slug: string }) {
  const all = useAllProperties();
  const guide = getNeighborhoodGuide(slug);
  if (!guide) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-black">Area guide not found</h1>
        <Button className="mt-4 font-bold" onClick={() => navigate('/properties')}>Browse properties</Button>
      </div>
    );
  }
  const inventory = all.filter((p) => p.area === guide.area);
  const insight = areaInsights[guide.area];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate('/properties')} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All properties
      </button>

      <div className="relative mt-5 overflow-hidden rounded-3xl border">
        <div className="aspect-[21/8] bg-muted">
          {guide.gallery[0] && (
            <img src={`${guide.gallery[0].base}.webp`} srcSet={srcsetFor(`${guide.gallery[0].base}.webp`)} sizes={GALLERY_SIZES} alt={guide.gallery[0].alt} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden />
        <div className="absolute bottom-0 p-6 sm:p-8">
          <Badge className="border-0 bg-gold text-[10px] font-black uppercase tracking-widest text-gold-foreground">Area guide</Badge>
          <h1 className="mt-2.5 text-3xl font-black text-white sm:text-4xl">{guide.name}</h1>
          <p className="mt-1 text-sm font-semibold text-white/85">{guide.tagline}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {guide.location}
          </p>
        </div>
      </div>

      {/* stat strip */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {guide.stats.map((s) => (
          <div key={s.label} className="card-lift rounded-2xl border bg-card p-4">
            <p className="text-lg font-black">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-black tracking-tight">The area in brief</h2>
            <p className="mt-2.5 text-[15px] leading-[1.75] text-muted-foreground">{guide.summary}</p>
          </section>
          <section>
            <h2 className="text-xl font-black tracking-tight">Investment thesis</h2>
            <div className="mt-3 space-y-3">
              {guide.investmentThesis.map((t) => (
                <div key={t.title} className="flex gap-3.5 rounded-2xl border bg-card p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
                    <t.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{t.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {guide.gallery.length > 1 && (
            <section>
              <h2 className="text-xl font-black tracking-tight">Around the neighbourhood</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {guide.gallery.slice(1, 7).map((g) => (
                  <div key={g.base} className="overflow-hidden rounded-xl border">
                    <img src={`${g.base}.webp`} srcSet={srcsetFor(`${g.base}.webp`)} sizes={GALLERY_SIZES} alt={g.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  </div>
                ))}
              </div>
              {guide.photoNote && <p className="mt-2 text-[10px] text-muted-foreground">{guide.photoNote}</p>}
            </section>
          )}
          {guide.sources.length > 0 && (
            <section>
              <h2 className="text-base font-black tracking-tight">Sources</h2>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {guide.sources.map((src) => (
                  <li key={src.label}>· {src.label}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {insight && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <TrendingUp className="h-4 w-4 text-gold" aria-hidden /> Market band
              </h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between border-b border-dashed pb-2">
                  <span className="text-muted-foreground">Price per m²</span>
                  <span className="font-black">{insight.avgPricePerSqm}</span>
                </div>
                <div className="flex justify-between border-b border-dashed pb-2">
                  <span className="text-muted-foreground">Typical yield</span>
                  <span className="font-black text-primary">{insight.yield}</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{insight.note}</p>
            </div>
          )}
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="text-sm font-black uppercase tracking-wider">Amenities</h3>
            <div className="mt-3 grid gap-2">
              {guide.amenities.slice(0, 8).map((a) => (
                <div key={a.title} className="flex items-start gap-2.5 text-sm">
                  <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-bold">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* live inventory join */}
      <section className="mt-10">
        <h2 className="text-xl font-black tracking-tight">
          Live {guide.area} inventory ({guideInventoryCount(guide, all)})
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {inventory.slice(0, 4).map((p, i) => (
            <PropertyCard key={p.id} property={p} index={i} compact />
          ))}
          {inventory.length === 0 && (
            <p className="text-sm text-muted-foreground">No live listings in this area right now — save a search and we&rsquo;ll alert you.</p>
          )}
        </div>
      </section>

      {NEIGHBORHOOD_GUIDES.length > 1 && null}
    </div>
  );
}
