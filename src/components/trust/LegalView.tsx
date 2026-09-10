'use client';
/** Legal — terms, privacy, disclaimers in plain, honest language. */
import { AlertTriangle, FileText, Gavel, Lock, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SITE } from '@/config';

const SECTIONS = [
  {
    icon: Scale,
    title: 'Terms of service (trial platform)',
    paras: [
      'Keja AI is operated by Chacadom Investments as a trial platform. Listings, trust scores, valuations, analytics, banking comparisons and portfolio data are illustrative demo data unless explicitly marked otherwise in the claims register.',
      'The platform — including the AI advisor, the Deal Analyst and the KEJA Trust Score — provides decision support only. It does not constitute legal, valuation, financial, tax or regulatory advice, and it does not replace professional due diligence.',
      'Tokenization features operate exclusively in trial mode with fictional assets and a virtual wallet. No digital tokens offered here represent legal ownership of any real estate, and no securities are offered, solicited or sold. Live issuance will occur only within the appropriate CMA regulatory framework.',
      'User contributions (listings, reports, enquiries) must be truthful. We reserve the right to remove content that fails the platform\u2019s verification or conduct standards.',
    ],
  },
  {
    icon: Lock,
    title: 'Privacy & data protection',
    paras: [
      'This build stores your data — favorites, comparisons, portfolio entries, chat history, trial wallet — locally on your device (browser localStorage). Nothing is transmitted to a server in this trial build.',
      'Where the live product processes personal data, it does so under the Kenya Data Protection Act (2019): lawful basis documented, purpose-limited, retained no longer than necessary, and with your rights to access, correction, objection and erasure honoured.',
      'Documents uploaded to the AI Deal Analyst are processed on-device and never uploaded. Analytics in this build are local-only, with no third-party trackers.',
      'Contact: the data controller can be reached at ' + SITE.email + '.',
    ],
  },
  {
    icon: AlertTriangle,
    title: 'AI limitations & escalation',
    paras: [
      'Keja AI is an assistive tool. Answers are generated from platform data with rule-based engines and labelled FACT, ESTIMATE or ASSUMPTION. Errors are possible; verify anything material with a professional.',
      'Legal, tax, valuation, lending-suitability and regulatory questions are escalated to qualified humans rather than improvised by the model. The escalation guard is a designed behaviour, not a fallback.',
    ],
  },
  {
    icon: Gavel,
    title: 'Intellectual property & trademarks',
    paras: [
      'The KEJA name, the KEJA Trust Score\u2122, the Investment Score\u2122, the Property Passport and the ecosystem marks are Chacadom Investments intellectual property. The claims register and methodology text may be quoted with attribution.',
      'Third-party marks (banks, institutions) are referenced nominatively and belong to their owners.',
    ],
  },
];

export default function LegalView() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Legal</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Terms &amp; privacy, in plain language</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Legal pages that nobody reads protect nobody. This one is short, honest and specific
          about what this platform is and is not.
        </p>
      </div>
      <div className="mt-8 space-y-5">
        {SECTIONS.map((s) => (
          <section key={s.title} className="rounded-3xl border bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2.5 text-lg font-black tracking-tight">
              <s.icon className="h-5 w-5 text-gold" aria-hidden /> {s.title}
            </h2>
            <div className="mt-3 space-y-3">
              {s.paras.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
              ))}
            </div>
          </section>
        ))}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" aria-hidden />
          Last updated {new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })} · a {SITE.parent} venture · Nairobi, Kenya.
        </p>
      </div>
    </div>
  );
}
