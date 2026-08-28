import { Bot, ShieldCheck, Languages, Zap } from 'lucide-react'
import ChatWindow from '@/components/ai/ChatWindow'

export default function AskKeja() {
  return (
    <div className="bg-cream/60">
      <div className="container-luxe py-10 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Conversational property intelligence</p>
          <h1 className="heading-display mt-3 text-3xl sm:text-5xl">
            Ask <span className="gold-text">Keja</span> anything
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
            Kenya’s AI real-estate advisor. Property search, investment math, trust checks and buying guidance —
            in English, Kiswahili and Français. Facts, estimates and assumptions always labelled.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-muted">
            <span className="chip"><Zap className="h-3.5 w-3.5" /> Instant replies</span>
            <span className="chip"><Languages className="h-3.5 w-3.5" /> EN · SW · FR</span>
            <span className="chip"><ShieldCheck className="h-3.5 w-3.5" /> Verified answers only</span>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="h-[640px]">
            <ChatWindow />
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: Bot,
              title: 'Try: property search',
              prompt: '"2 bedroom Kilimani under 15M"',
            },
            {
              icon: Zap,
              title: 'Try: investment math',
              prompt: '"Is Westlands a good investment?"',
            },
            {
              icon: ShieldCheck,
              title: 'Try: trust checks',
              prompt: '"How do you verify listings?"',
            },
          ].map((c) => (
            <div key={c.title} className="card-luxe p-5">
              <c.icon className="h-5 w-5 text-gold-600" />
              <p className="mt-2.5 text-sm font-bold text-ink">{c.title}</p>
              <p className="mt-1 text-sm italic text-ink-muted">{c.prompt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
