'use client';
/** Article detail — long-form reader with FACT/ESTIMATE discipline notes. */
import { ArrowLeft, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ARTICLES } from '@/data/articles';
import { navigate } from '@/lib/router';

export default function ArticleDetailView({ slug }: { slug: string }) {
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-black">Article not found</h1>
        <Button className="mt-4 font-bold" onClick={() => navigate('/insights')}>Back to insights</Button>
      </div>
    );
  }
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate('/insights')} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All insights
      </button>
      <Badge variant="outline" className="mt-5">{article.category}</Badge>
      <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" aria-hidden /> {article.author}</span>
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> {article.minutes} min read</span>
        <span>{new Date(article.date).toLocaleDateString('en-KE', { dateStyle: 'long' })}</span>
      </div>
      <p className="mt-5 border-l-4 border-gold pl-4 text-base font-semibold leading-relaxed text-muted-foreground">
        {article.excerpt}
      </p>
      <div className="mt-8 space-y-5">
        {article.blocks.map((b, i) => (
          <div key={i}>
            {b.h && <h2 className="mt-8 text-xl font-black tracking-tight">{b.h}</h2>}
            {b.p && <p className="mt-3 text-[15px] leading-[1.75] text-muted-foreground">{b.p}</p>}
            {b.list && (
              <ul className="mt-3 space-y-2">
                {b.list.map((li, j) => (
                  <li key={j} className="flex gap-2.5 text-[15px] leading-relaxed text-muted-foreground">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden /> {li}
                  </li>
                ))}
              </ul>
            )}
            {b.quote && (
              <blockquote className="mt-4 rounded-2xl bg-accent/50 p-5 text-[15px] font-semibold italic leading-relaxed">
                &ldquo;{b.quote}&rdquo;
              </blockquote>
            )}
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-gold/40 bg-gold-soft p-5 text-xs leading-relaxed text-gold-foreground/85">
        Editorial discipline: figures in Keja guides are labelled as FACT (verifiable), ESTIMATE
        (model-derived) or REPORTED (publicly reported) at source. This article is general
        information, not legal, valuation, financial or tax advice.
      </div>
    </article>
  );
}
