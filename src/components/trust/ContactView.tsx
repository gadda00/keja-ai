'use client';
/** Contact — the human channel behind the platform. */
import { useState } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { SITE, whatsappLink } from '@/config';

export default function ContactView() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'General', message: '' });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-primary/40 font-bold text-primary">Contact</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Talk to a human</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          The AI answers questions; people answer everything else. Reach the desk on WhatsApp for
          the fastest response, or leave a message and we&rsquo;ll come back within one business day.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          {[
            { icon: MessageCircle, title: 'WhatsApp (fastest)', value: SITE.phone, note: 'Mon–Sat, response within hours', href: whatsappLink('Hello Keja AI — I have a question.') },
            { icon: Mail, title: 'Email', value: SITE.email, note: 'Replies within one business day', href: `mailto:${SITE.email}` },
            { icon: MapPin, title: 'Office', value: SITE.offices, note: 'Visits by appointment' },
            { icon: Clock, title: 'Hours', value: 'Mon–Fri 8:30–17:30 EAT · Sat 9:00–13:00', note: 'Diaspora slots in UK/US/UAE timezones' },
          ].map((c) => (
            <div key={c.title} className="flex gap-4 rounded-2xl border bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                <c.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{c.title}</p>
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-sm font-bold text-primary hover:underline">{c.value}</a>
                ) : (
                  <p className="mt-0.5 text-sm font-bold">{c.value}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast({ title: 'Message sent', description: `Thank you ${form.name || 'there'} — the desk replies within one business day.` });
              setForm({ name: '', email: '', topic: 'General', message: '' });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ct-name">Name</Label>
                <Input id="ct-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-email">Email</Label>
                <Input id="ct-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-topic">Topic</Label>
              <select
                id="ct-topic"
                className="h-9 rounded-lg border bg-background px-3 text-sm"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              >
                {['General', 'Buying', 'Selling / listing', 'Investing', 'Tokenization trial', 'Partnership', 'Press', 'Report an issue'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-msg">Message</Label>
              <Textarea id="ct-msg" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can the desk help?" />
            </div>
            <Button type="submit" className="font-black">
              <Send className="mr-1.5 h-4 w-4" aria-hidden /> Send message
            </Button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Trial build: messages are acknowledged on-device. The live product routes to the
              client desk with ticketing and response standards.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
