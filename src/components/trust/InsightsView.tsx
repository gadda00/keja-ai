'use client';
/** Insights — long-form market guides (proposal: content + SEO surface). */
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ARTICLES } from '@/data/articles';
import { navigate } from '@/lib/router';

const CATEGORY_COLOR: Record<string, string> = {
  'Buying Guide': 'border-primary/40 text-primary',
  Investing: 'border-gold/50 text-gold-foreground',
  Diaspora: 'border-emerald-600/40 text-emerald-700 dark:text-emerald-400',
  'Trust & Safety': 'border-primary/40 text-primary',
  'Market Notes': 'border-border text-muted-foreground',
};

export default function InsightsView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-gold/50 font-bold text-gold-foreground">Keja Insights</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Market guides that respect your intelligence</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Long-form, Kenya-specific guides — buying mechanics, mortgage maths, diaspora safety,
          tokenization in plain language — written to the same FACT/ESTIMATE discipline as the
          platform.
        </p>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a, i) => (
          <button
            key={a.slug}
            onClick={() => navigate(`/insights/${a.slug}`)}
            className="card-lift group flex flex-col rounded-2xl border bg-card p-5 text-left"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`text-[10px] font-bold ${CATEGORY_COLOR[a.category]}`}>{a.category}</Badge>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden /> {a.minutes} min
              </span>
            </div>
            <h2 className="mt-3.5 text-[15px] font-bold leading-snug group-hover:text-primary">{a.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>
            <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-muted-foreground">
              <span>{a.author} · {new Date(a.date).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</span>
              <span className="inline-flex items-center gap-1 font-bold text-primary">
                Read <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-gold" aria-hidden />
          <div>
            <h2 className="text-base font-black">Want numbers, not prose?</h2>
            <p className="text-sm text-muted-foreground">Keja Data answers market questions live from inventory.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/data')}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          Open Keja Data
        </button>
      </div>
    </div>
  );
}
