import { Bot, CheckCircle2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { SITE, whatsappLink } from '@/config';
import { asset } from '@/config';
import { usePageMeta } from '@/lib/seo';
import type { Lead } from '@/lib/store';
import { KEYS, useStore } from '@/lib/store';

export default function Contact() {
  usePageMeta(
    'Contact — Talk to Team Keja',
    'Reach the Keja.ai team on WhatsApp, email or phone — or request an escorted viewing.'
  );
  const [leads, setLeads] = useStore<Lead[]>(KEYS.leads, []);
  const [form, setForm] = useState({ name: '', email: '', phone: '', interest: '', message: '' });
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const lead: Lead = {
      id: `L-${Date.now()}`,
      name: form.name,
      phone: form.phone || '—',
      email: form.email,
      interest: form.interest || 'General enquiry',
      source: 'contact',
      temperature: /now|urgent|asap/i.test(form.message) ? 'HOT' : 'WARM',
      note: form.message.slice(0, 200),
      createdAt: new Date().toISOString(),
    };
    setLeads([...leads, lead]);
    setSent(true);
  };

  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Contact</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-5xl">
            Talk to a human. <span className="gold-text">Or to Keja.</span>
          </h1>
          <p className="mt-4 leading-relaxed text-ink-muted">
            Whether you’re buying, selling, investing or want to onboard your agency onto the Keja
            network — we reply fast, and clearly. No pressure, ever. That’s the house rule.
          </p>
        </div>

        <div className="mt-10 grid gap-8 grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          {/* form */}
          <div className="card-luxe p-6 sm:p-8">
            {sent ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                <h2 className="mt-4 font-display text-2xl font-bold text-ink">
                  Message received — asante sana!
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
                  {form.name.split(' ')[0]}, your enquiry is in the pipeline and a member of our
                  team will respond within one business day. Anything urgent? Keja answers
                  instantly, around the clock.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link to="/ask" className="btn-gold">
                    <Bot className="h-4 w-4" /> Chat with Keja
                  </Link>
                  <Link to="/properties" className="btn-outline">
                    Browse listings
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ct-name" className="label-luxe">
                      Full name *
                    </label>
                    <input
                      id="ct-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input-luxe"
                      placeholder="Jane Wanjiku"
                    />
                  </div>
                  <div>
                    <label htmlFor="ct-phone" className="label-luxe">
                      Phone *
                    </label>
                    <input
                      id="ct-phone"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="input-luxe"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>
                </div>
                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ct-email" className="label-luxe">
                      Email
                    </label>
                    <input
                      id="ct-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input-luxe"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="ct-interest" className="label-luxe">
                      I’m interested in
                    </label>
                    <select
                      id="ct-interest"
                      value={form.interest}
                      onChange={(e) => setForm({ ...form, interest: e.target.value })}
                      className="input-luxe"
                    >
                      <option value="">Choose one…</option>
                      <option>Buying a home</option>
                      <option>Investment property</option>
                      <option>Renting</option>
                      <option>Selling my property</option>
                      <option>Property management</option>
                      <option>Onboarding my agency</option>
                      <option>Partnership with Chacadom</option>
                      <option>Something else</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="ct-message" className="label-luxe">
                    Message *
                  </label>
                  <textarea
                    id="ct-message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="input-luxe resize-none"
                    placeholder="Tell us what you need — budget, areas, timeline. Keja will prep answers before we call."
                  />
                </div>
                <button type="submit" className="btn-gold w-full sm:w-auto">
                  <Send className="h-4 w-4" /> Send message
                </button>
              </form>
            )}
          </div>

          {/* contact info */}
          <div className="space-y-4">
            <a
              href={whatsappLink('Hello! I have a question about Keja.ai.')}
              target="_blank"
              rel="noreferrer"
              className="card-luxe card-luxe-hover flex items-center gap-4 p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
                <MessageCircle className="h-6 w-6 text-white" fill="currentColor" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-ink">WhatsApp — fastest</p>
                <p className="text-sm text-ink-muted">
                  Instant answers, viewing requests, escrow prompts. Kenya’s channel.
                </p>
              </div>
            </a>

            <Link to="/ask" className="card-luxe card-luxe-hover flex items-center gap-4 p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient shadow-gold-sm">
                <Bot className="h-6 w-6 text-white" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-ink">Ask Keja AI — 24/7</p>
                <p className="text-sm text-ink-muted">
                  Property search, investment math, trust checks — instantly, in 3 languages.
                </p>
              </div>
            </Link>

            <div className="card-luxe p-6">
              <h3 className="font-display text-lg font-semibold text-ink">Direct lines</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-3 text-ink-soft">
                  <Phone className="h-4 w-4 text-gold-600" /> {SITE.phone}
                </li>
                <li className="flex items-center gap-3 text-ink-soft">
                  <Mail className="h-4 w-4 text-gold-600" /> {SITE.email}
                </li>
                <li className="flex items-center gap-3 text-ink-soft">
                  <MapPin className="h-4 w-4 text-gold-600" /> {SITE.offices}
                </li>
              </ul>
              <div className="mt-5 rounded-xl bg-gold-50 p-4 text-xs leading-relaxed text-ink-soft">
                <b>Keja.ai</b> is a Chacadom Investments venture. For investment advisory, joint
                ventures and portfolio management, our Chacadom desk handles institutional
                enquiries.
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl">
              <img
                src={asset('/brand/keja-banner.jpg')}
                alt="Keja by Chacadom"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
