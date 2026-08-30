import SmartImg from '@/components/ui/SmartImg'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Send, Sparkles, ShieldCheck, Languages, Trash2 } from 'lucide-react'
import { kejaAI, AIResponse } from '@/lib/ai/engine'
import { useStore, KEYS, ChatMessage, type Lead } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import Markdown from './Markdown'
import { useAllProperties } from '@/lib/inventory'
import { formatKES } from '@/lib/format'
import { asset, whatsappLink } from '@/config'
import { isRentalPrice } from '@/lib/finance'

const uid = () => Math.random().toString(36).slice(2, 10)

const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function ChatWindow({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useStore<ChatMessage[]>(KEYS.chat, [])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [lang, setLang] = useState(kejaAI.language)
  const bottomRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const navigate = useNavigate()
  const { setAuthModalOpen } = useAuth()
  const allProperties = useAllProperties()
  const [, setLeads] = useStore<Lead[]>(KEYS.leads, [])

  useEffect(() => {
    if (!started.current && messages.length === 0) {
      started.current = true
      const greeting: ChatMessage = { id: uid(), role: 'keja', text: '', ts: new Date().toISOString() }
      const r = kejaAI.respond('hello')
      greeting.text = r.text
      greeting.quickReplies = r.quickReplies
      setMessages([greeting])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing])

  const send = (text: string, force = false) => {
    const clean = text.trim()
    if (!clean || (typing && !force)) return
    const userMsg: ChatMessage = { id: uid(), role: 'user', text: clean, ts: new Date().toISOString() }
    setMessages([...messages, userMsg])
    setInput('')

    // navigation shortcuts from quick replies
    const navShortcut: Record<string, { to: string; msg: string }> = {
      'open keja tokenize': { to: '/tokenize', msg: 'Taking you to **Keja Tokenize** — our tokenized real-estate marketplace. 🪙' },
      'explore the ecosystem': { to: '/ecosystem', msg: 'Opening the **KEJA ecosystem** — all eight products, one intelligence layer. ✨' },
      'become a partner': { to: '/partners', msg: 'Heading to the **Partner Network** — five channels to get your inventory on Keja. 🤝' },
      'sign in now': { to: '', msg: '' }, // handled via auth modal below
      'sign in as admin': { to: '', msg: '' },
    }
    const shortcut = navShortcut[clean.toLowerCase()]
    if (shortcut) {
      if (clean.toLowerCase() === 'sign in now' || clean.toLowerCase() === 'sign in as admin') {
        const kejaMsg: ChatMessage = {
          id: uid(),
          role: 'keja',
          text: 'Opening the **sign-in panel** for you now. Pick *Continue with Google* or use a demo account. 🔐',
          ts: new Date().toISOString(),
        }
        setMessages([...messages, userMsg, kejaMsg])
        setTimeout(() => setAuthModalOpen(true), 500)
        return
      }
      const kejaMsg: ChatMessage = {
        id: uid(),
        role: 'keja',
        text: shortcut.msg,
        ts: new Date().toISOString(),
      }
      setMessages([...messages, userMsg, kejaMsg])
      setTimeout(() => navigate(shortcut.to), 600)
      return
    }

    setTyping(true)

    const response = kejaAI.respond(clean)
    const delay = Math.min(900 + clean.length * 12, 2200)
    setTimeout(() => {
      const kejaMsg: ChatMessage = {
        id: uid(),
        role: 'keja',
        text: response.text,
        ts: new Date().toISOString(),
        meta: response.meta?.map((m) => `${m.label}: ${m.text}`),
        quickReplies: response.quickReplies,
        propertyIds: response.propertyIds,
      }
      setMessages((prev: ChatMessage[]) => [...prev, kejaMsg])
      setTyping(false)
      // Completed qualification → write the lead so the sales CRM (Admin →
      // Leads, agent Dashboard) actually receives what the bot promised.
      if (kejaAI.lastQualification && /lead rating:|your profile:/i.test(response.text)) {
        const q = kejaAI.lastQualification
        const lead: Lead = {
          id: `lead-${Date.now()}`,
          name: q.name ?? 'AI qualification',
          phone: '',
          interest: q.interest ?? 'Qualified via Keja AI',
          budget: q.budget,
          timeline: q.timeline,
          temperature: (q.temperature as Lead['temperature']) ?? 'WARM',
          source: 'chat',
          note: 'Captured by the 4-question AI qualification flow',
          createdAt: new Date().toISOString(),
        }
        setLeads((prev: Lead[]) => [lead, ...prev])
        kejaAI.lastQualification = null
      }
      // Engine actions — the conversion moments (human handoff, calculator…)
      if (response.action === 'whatsapp') {
        window.open(whatsappLink('Hello Keja — I was chatting with Keja AI and would like to talk to the client desk.'), '_blank', 'noopener')
      } else if (response.action === 'open-calculator') {
        setTimeout(() => navigate('/calculator'), 700)
      }
    }, delay)
  }

  const quickReplies = (() => {
    const defaultQ = ['Find me a home', 'Show investment deals', 'How do you verify listings?']
    if (typing) return []
    // Engine-authored chips take priority (persisted on the message)
    const lastKeja = [...messages].reverse().find((m) => m.role === 'keja')
    if (!lastKeja) return defaultQ
    if (lastKeja.quickReplies) return lastKeja.quickReplies
    // Legacy fallback for history saved before quickReplies were persisted
    if (/What are you looking for|Natafuta|recherchez/.test(lastKeja.text)) return ['Find me a home', 'Show investment deals', 'Land under 4M', 'I want to rent']
    if (/Trust Score|trust is literally|Great question/.test(lastKeja.text)) return ['What is Ardhisasa?', 'Show me only verified listings', 'Show a flagged example']
    if (/Keja Tokenize/.test(lastKeja.text)) return ['Open Keja Tokenize', 'What are the risks?', 'Show investment deals']
    if (/question 1 of 4|Question 1 of 4/i.test(lastKeja.text)) return []
    if (/Habari|Bonjour/.test(lastKeja.text)) return defaultQ
    return []
  })()

  const clearChat = () => {
    kejaAI.qualificationState = null
    const greeting: ChatMessage = { id: uid(), role: 'keja', text: kejaAI.respond('hello').text, ts: new Date().toISOString(), quickReplies: ['Find me a home', 'Show investment deals', 'How do you verify listings?', 'I want to sell property'] }
    setMessages([greeting])
  }

  const changeLanguage = (code: 'en' | 'sw' | 'fr') => {
    kejaAI.setLanguage(code)
    setLang(code)
    const greeting = {
      en: 'Hello',
      sw: 'Habari',
      fr: 'Bonjour',
    }[code]
    send(greeting, true)
  }

  const propertyCards = (ids?: string[]) => {
    const props = allProperties.filter((p) => ids?.includes(p.id))
    if (!props.length) return null
    return (
      <div className={`mt-3 grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {props.slice(0, compact ? 2 : 4).map((p) => (
          <Link
            key={p.id}
            to={`/properties/${p.id}`}
            className="card-luxe card-luxe-hover flex items-center gap-3 p-3"
          >
            <SmartImg src={p.images[0]} alt={p.title} className="h-16 w-20 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">{p.title}</p>
              <p className="mt-0.5 text-xs text-gold-700">{formatKES(p.price, { monthly: isRentalPrice(p.price) })}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
                Trust {p.trustScore} · {p.area}
              </p>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  const metaLabels = (meta?: string[]) => {
    if (!meta?.length) return null
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {meta.map((m, i) => {
          const [label, ...rest] = m.split(': ')
          const tone =
            label === 'FACT'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : label === 'ESTIMATE'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-sky-200 bg-sky-50 text-sky-700'
          return (
            <span key={i} className={`rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${tone}`}>
              <b className="mr-1">{label}</b>
              {rest.join(': ')}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gold-100">
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-gold-100 bg-gradient-to-r from-gold-50 to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={asset('/brand/keja-mascot.jpg')} alt="Keja" className="h-10 w-10 rounded-full object-cover ring-2 ring-gold-300" />
          <div>
            <p className="font-display text-base font-bold text-ink">Keja AI</p>
            <p className="flex items-center gap-1 text-[11px] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online · replies instantly · verified answers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearChat}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-ink-muted transition hover:bg-gold-50 hover:text-gold-700"
            aria-label="Clear conversation and start over"
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <Languages className="h-4 w-4 text-ink-faint" />
          {(['en', 'sw', 'fr'] as const).map((code) => (
            <button
              key={code}
              onClick={() => changeLanguage(code)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase transition ${
                lang === code ? 'bg-gold-gradient text-white shadow-gold-sm' : 'text-ink-muted hover:bg-gold-50'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-cream/40 px-4 py-5 sm:px-5" style={{ minHeight: compact ? 320 : 440 }} aria-live="polite" aria-label="Conversation with Keja AI">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] sm:max-w-[78%] ${m.role === 'user' ? 'order-1' : ''}`}>
              {m.role === 'keja' && (
                <img src={asset('/brand/keja-mascot.jpg')} alt="Keja" className="mb-1.5 h-7 w-7 rounded-full object-cover ring-1 ring-gold-200" />
              )}
              <div
                className={
                  m.role === 'user'
                    ? 'rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-sm text-white shadow-sm'
                    : 'rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gold-100'
                }
              >
                {m.role === 'user' ? m.text : <Markdown content={m.text} />}
                {m.role === 'keja' && metaLabels(m.meta)}
              </div>
              <p className={`mt-1 text-[10px] text-ink-faint ${m.role === 'user' ? 'text-right' : ''}`}>{fmtTime(m.ts)}</p>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gold-100">
              <span className="typing-dot h-2 w-2 rounded-full bg-gold-400" />
              <span className="typing-dot h-2 w-2 rounded-full bg-gold-400" />
              <span className="typing-dot h-2 w-2 rounded-full bg-gold-400" />
            </div>
          </div>
        )}

        {/* property cards from last keja message */}
        {!typing &&
          (() => {
            const lastKeja = [...messages].reverse().find((m) => m.role === 'keja')
            if (!lastKeja) return null
            const ids = lastKeja.propertyIds?.length
              ? lastKeja.propertyIds
              : [...new Set([...lastKeja.text.matchAll(/KJA-(?:A?\d{3,4})/g)].map((m) => m[0]))]
            if (ids.length === 0 || lastKeja.text.length > 2200) return null
            return propertyCards(ids)
          })()}

        <div ref={bottomRef} />
      </div>

      {/* quick replies */}
      {quickReplies.length > 0 && !typing && (
        <div className="flex gap-2 overflow-x-auto border-t border-gold-100 bg-white px-4 py-2.5 no-scrollbar">
          {quickReplies.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="whitespace-nowrap rounded-full border border-gold-200 bg-gold-50 px-3.5 py-1.5 text-xs font-medium text-gold-700 transition hover:border-gold-400 hover:bg-gold-100"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 border-t border-gold-100 bg-white px-4 py-3"
      >
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about property, areas, yields, verification..."
            className="input-luxe !pl-10"
          />
          <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-500" />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || typing}
          className="btn-gold !px-4 !py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <div className="flex items-center gap-1.5 border-t border-gold-100 bg-gold-50/50 px-4 py-2 text-[10px] text-ink-faint">
        <ShieldCheck className="h-3 w-3 text-gold-600" />
        Keja separates verified facts, AI estimates and assumptions — always shown, never blended. A Chacadom Investments venture.
      </div>
    </div>
  )
}
