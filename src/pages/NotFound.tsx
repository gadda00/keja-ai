import { Link, useLocation } from 'react-router-dom'
import { Search, ShieldCheck, Bot } from 'lucide-react'

export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <div className="container-luxe flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl font-bold gold-text">404</p>
      <h1 className="heading-display mt-4 text-3xl">This page moved off the market</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
        We couldn't find <span className="font-mono text-xs text-ink-soft">{pathname}</span>.
        It may have been sold, delisted, or never existed. Let's get you back to verified ground.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/properties" className="btn-gold">
          <Search className="h-4 w-4" /> Browse properties
        </Link>
        <Link to="/" className="btn-outline-luxe">Back to home</Link>
        <Link to="/trust" className="btn-outline-luxe">
          <ShieldCheck className="h-4 w-4" /> Trust Center
        </Link>
        <Link to="/ask" className="btn-dark">
          <Bot className="h-4 w-4" /> Ask Keja AI
        </Link>
      </div>
    </div>
  )
}
