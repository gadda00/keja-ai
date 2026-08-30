import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { useNotifications } from '@/lib/searchStore'

/** Navbar notification bell + inbox dropdown. */
export default function NotificationBell() {
  const { notifs, unread, markAllRead, clearAll, markOneRead, removeOne } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const fmt = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-lg p-2 text-ink-soft transition hover:bg-gold-50 hover:text-gold-700"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-gradient px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-0 right-0 top-16 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl bg-white shadow-gold-lg ring-1 ring-gold-200 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-gold-100 px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            <div className="flex items-center gap-1">
              {notifs.length > 0 && (
                <>
                  <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-gold-50 hover:text-gold-700">
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                  <button onClick={clearAll} aria-label="Clear all notifications" className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto" role="region" aria-label="Notification list">
            {notifs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                No notifications yet. Save a search on the marketplace and we'll alert you when new matches arrive.
              </p>
            ) : (
              notifs.slice(0, 12).map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 border-b border-gold-50 px-4 py-3 transition hover:bg-gold-50/60 ${n.read ? '' : 'bg-gold-50/40'}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-gold-200' : 'bg-gold-600'}`} aria-hidden="true" />
                  <Link to={n.href ?? '/properties'} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                    <span className={`block text-[13px] ${n.read ? 'font-medium text-ink-soft' : 'font-bold text-ink'}`}>{n.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{n.body}</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted/70">{fmt(n.createdAt)}</span>
                  </Link>
                  <span className="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    {!n.read && (
                      <button
                        onClick={() => markOneRead(n.id)}
                        aria-label={`Mark "${n.title}" as read`}
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-gold-100 hover:text-gold-700"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => removeOne(n.id)}
                      aria-label={`Delete notification "${n.title}"`}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
