import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, CalendarDays, User } from 'lucide-react'
import { ARTICLES } from '@/data/articles'
import { usePageMeta } from '@/lib/seo'

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const article = ARTICLES.find((a) => a.slug === slug)
  usePageMeta(
    article ? `${article.title}` : 'Article not found',
    article?.excerpt,
  )

  if (!article) {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="heading-display text-3xl">Article not found</p>
        <Link to="/insights" className="btn-gold mt-6">Back to Insights</Link>
      </div>
    )
  }

  const related = ARTICLES.filter((a) => a.slug !== slug && a.category === article.category).slice(0, 2)

  return (
    <article className="bg-white">
      <header className="bg-ink py-16 sm:py-20">
        <div className="container-luxe max-w-3xl">
          <Link to="/insights" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-400 hover:text-gold-300">
            <ArrowLeft className="h-3.5 w-3.5" /> All insights
          </Link>
          <p className="eyebrow mt-4 !text-gold-400">{article.category}</p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{article.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/65">{article.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{article.author}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(article.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{article.minutes} min read</span>
          </div>
        </div>
      </header>

      <div className="container-luxe max-w-3xl py-12">
        {article.blocks.map((b, i) =>
          b.h ? (
            <h2 key={i} className="mt-10 font-display text-2xl font-bold text-ink first:mt-0">{b.h}</h2>
          ) : b.list ? (
            <ul key={i} className="mt-4 space-y-2.5">
              {b.list.map((li) => (
                <li key={li} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                  {li}
                </li>
              ))}
            </ul>
          ) : b.quote ? (
            <blockquote key={i} className="my-10 border-l-4 border-gold-400 bg-cream/60 px-6 py-5 font-display text-lg italic leading-relaxed text-ink">
              “{b.quote}”
            </blockquote>
          ) : (
            <p key={i} className="mt-4 text-[15px] leading-[1.85] text-ink-soft first:mt-0">{b.p}</p>
          ),
        )}

        <div className="mt-12 rounded-2xl bg-ink p-6 text-center">
          <p className="font-display text-lg font-bold text-white">Put this into practice on live inventory</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
            Run the numbers yourself — verified listings, Investment Scores and the full calculator suite.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/properties" className="btn-gold">Browse verified listings</Link>
            <Link to="/invest" className="btn-outline !bg-transparent !text-gold-300 !border-gold-500/60">Open calculators</Link>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <p className="eyebrow">More in {article.category}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((a) => (
                <Link key={a.slug} to={`/insights/${a.slug}`} className="card-luxe card-luxe-hover p-5">
                  <p className="font-display text-base font-bold leading-snug text-ink">{a.title}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">{a.excerpt}</p>
                  <p className="mt-3 text-xs font-bold text-gold-700">{a.minutes} min read →</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}
