'use client';
/**
 * Site footer — ecosystem sitemap, portals, company, legal and the trust
 * disclaimer. Sticky to the viewport bottom on short pages (mt-auto on a
 * min-h-screen flex column), pushed down naturally on long pages.
 */
import { Link } from '@/lib/router';
import { ECOSYSTEM, PORTALS } from '@/lib/ecosystem';
import { SITE } from '@/config';
import { useI18n } from '@/lib/i18n';

const COMPANY = [
  { to: '/about', label: 'About Keja' },
  { to: '/ecosystem', label: 'The Ecosystem' },
  { to: '/trust', label: 'Trust & Security Center' },
  { to: '/partners', label: 'Partner with Keja' },
  { to: '/contact', label: 'Contact' },
];

const RESOURCES = [
  { to: '/insights', label: 'Market Insights' },
  { to: '/data', label: 'KEJA Data' },
  { to: '/ask', label: 'Ask Keja AI' },
  { to: '/deal-analyst', label: 'AI Deal Analyst' },
  { to: '/legal', label: 'Terms & Privacy' },
];

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-auto border-t bg-cream pt-safe">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2.5" ariaLabel="Keja AI home">
              <img src="/favicon.svg" alt="" className="h-10 w-10" />
              <span className="text-xl font-bold tracking-tight">
                Keja<span className="text-gold"> AI</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('footer.tagline')}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              {SITE.tagline}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{SITE.offices}</span>
              <span>·</span>
              <a href={`mailto:${SITE.email}`} className="hover:text-foreground">
                {SITE.email}
              </a>
              <span>·</span>
              <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="hover:text-foreground">
                {SITE.phone}
              </a>
            </div>
          </div>

          <nav aria-label="Ecosystem">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
              {t('footer.product')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {ECOSYSTEM.map((p) => (
                <li key={p.key}>
                  <Link
                    to={p.route}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Portals and company">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
              Portals
            </h3>
            <ul className="mt-4 space-y-2.5">
              {PORTALS.map((p) => (
                <li key={p.route}>
                  <Link
                    to={p.route}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-foreground">
              {t('footer.company')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {COMPANY.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
              {t('footer.resources')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {RESOURCES.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-foreground">
              {t('footer.legal')}
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link to="/legal" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/trust" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Claims Register
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="hairline-gold mt-12" />

        <div className="mt-6 flex flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl leading-relaxed">
            © {new Date().getFullYear()} {SITE.parent}. Keja AI is a technology platform, not a
            licensed real-estate agency, valuer, law firm or securities exchange. AI analyses are
            decision support and never replace professional legal, valuation, financial or
            regulatory advice. Tokenization features operate in trial mode with fictional assets —
            no real securities are offered.
          </p>
          <p className="shrink-0">
            A {SITE.parent} venture · {SITE.swahiliNote}
          </p>
        </div>
      </div>
    </footer>
  );
}
