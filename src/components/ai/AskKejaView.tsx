'use client';
/**
 * Ask Keja AI — the conversational property advisor (proposal §2 KEJA AI).
 * Trilingual intent engine (EN/SW/FR) with property cards, FACT/ESTIMATE
 * labels, quick replies and human escalation. Chat history persists locally.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, MessageCircle, Send, Sparkles, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { kejaAI, type AIResponse } from '@/lib/ai/engine';
import { useAllProperties } from '@/lib/inventory';
import { useStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import { whatsappLink } from '@/config';
import { PropertyRow } from '@/components/property/PropertyCard';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'keja';
  text: string;
  ts: string;
  meta?: AIResponse['meta'];
  quickReplies?: string[];
  propertyIds?: string[];
  action?: AIResponse['action'];
}

const SUGGESTIONS = [
  '2BR apartment in Kilimani under 15M',
  'Where should I invest KSh 5 million?',
  'Explain the Trust Score',
  'Nisaidie kupata nyumba Westlands',
  'Mortgage on a 12M apartment',
  'How does verification work?',
];

function MetaChip({ label }: { label: string }) {
  const tone =
    label === 'FACT'
      ? 'bg-primary/10 text-primary'
      : label === 'ESTIMATE'
        ? 'bg-gold/15 text-gold-foreground'
        : label === 'REPORTED'
          ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider', tone)}>
      {label}
    </span>
  );
}

export default function AskKejaView() {
  const all = useAllProperties();
  const { lang } = useI18n();
  const [messages, setMessages] = useStore<ChatMessage[]>('chat-history', []);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // keep engine language in sync with the UI language
  useEffect(() => {
    kejaAI.setLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'keja',
          text: `**Karibu Keja AI** — your property advisor for Kenya. 🇰🇪\n\nI can search verified listings, run investment and mortgage math, explain areas and yields, and walk you through how verification works. I answer in **English, Kiswahili or French** — and I always label what is fact versus estimate.`,
          ts: new Date().toISOString(),
          quickReplies: SUGGESTIONS.slice(0, 3),
        },
      ]);
    }
     
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  const send = useCallback(
    (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || thinking) return;
      setInput('');
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);
      // small delay so the advisor feels conversational, not instant-cheap
      setTimeout(() => {
        const res = kejaAI.respond(text);
        const kejaMsg: ChatMessage = {
          id: `k-${Date.now()}`,
          role: 'keja',
          text: res.text,
          ts: new Date().toISOString(),
          meta: res.meta,
          quickReplies: res.quickReplies,
          propertyIds: res.propertyIds,
          action: res.action,
        };
        setMessages((prev) => [...prev.slice(-49), kejaMsg]);
        setThinking(false);
      }, 420);
    },
    [input, thinking, setMessages],
  );

  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-4xl flex-col px-4 sm:px-6">
      <div className="flex items-center justify-between gap-3 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Ask Keja AI</h1>
            <p className="text-xs text-muted-foreground">
              Trilingual advisor · every answer labelled FACT / ESTIMATE / ASSUMPTION
            </p>
          </div>
        </div>
        <Badge variant="outline" className="hidden shrink-0 font-bold sm:inline-flex">
          {messages.length - 1} messages
        </Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 slim-scroll sm:p-5">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn('flex gap-2.5', m.role === 'user' ? 'flex-row-reverse' : '')}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  m.role === 'keja' ? 'bg-primary text-primary-foreground' : 'bg-accent',
                )}
                aria-hidden
              >
                {m.role === 'keja' ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={cn('max-w-[85%] space-y-2', m.role === 'user' && 'text-right')}>
                <div
                  className={cn(
                    'inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed',
                    m.role === 'keja'
                      ? 'rounded-tl-sm bg-accent/70'
                      : 'rounded-tr-sm bg-primary text-primary-foreground',
                  )}
                >
                  <div className="[&_p]:m-0 [&_strong]:font-bold [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                </div>

                {m.meta && m.meta.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.meta.map((mm, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                      >
                        <MetaChip label={mm.label} /> {mm.text}
                      </span>
                    ))}
                  </div>
                )}

                {m.propertyIds && m.propertyIds.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {m.propertyIds
                      .map((id) => byId.get(id))
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((p) => (
                        <PropertyRow key={p!.id} property={p!} />
                      ))}
                  </div>
                )}

                {m.action === 'whatsapp' && (
                  <a href={whatsappLink('Hello — Keja AI routed me here.')} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-[#25D366] font-bold text-white hover:bg-[#25D366]/90">
                      <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> Continue on WhatsApp
                    </Button>
                  </a>
                )}
                {m.action === 'open-calculator' && (
                  <Button size="sm" variant="outline" className="font-bold" onClick={() => navigate('/invest')}>
                    <Calculator className="mr-1.5 h-4 w-4" aria-hidden /> Open the calculator
                  </Button>
                )}

                {m.role === 'keja' && m.quickReplies && m.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.quickReplies.map((qr) => (
                      <button
                        key={qr}
                        onClick={() => send(qr)}
                        className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {thinking && (
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-accent/70 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-end gap-2 border-t bg-background/60 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask anything — areas, yields, mortgages, verification…"
            aria-label="Message Keja AI"
            rows={1}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl"
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={!input.trim() || thinking} aria-label="Send message">
            <Send className="h-4.5 w-4.5" aria-hidden />
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 py-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Try:</span>
        {SUGGESTIONS.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
      <p className="pb-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        Keja AI provides decision support and never replaces legal, valuation, financial or regulatory
        professional advice. Legal, tax and suitability questions are escalated to qualified humans.
      </p>
    </div>
  );
}
