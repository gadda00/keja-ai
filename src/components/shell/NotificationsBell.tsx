'use client';
/**
 * NotificationsBell — the user-facing half of the alert pipeline.
 *
 * The sweep machinery (saved searches → matched listings → notifications,
 * src/lib/searchStore) has existed since Search v2 but was never mounted:
 * no component ran it and no surface could display its output, so the
 * Properties page's "We'll alert you when matching listings arrive" was a
 * promise the app could not keep. This component runs the sweep once the
 * inventory settles and renders the bell the notifications were built for.
 */
import { useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAllProperties } from '@/lib/inventory';
import { useAlertSweep, useNotifications } from '@/lib/searchStore';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const properties = useAllProperties();
  // one sweep after inventory settles (1.5 s debounce inside the hook)
  useAlertSweep(properties);
  const { notifs, unread, markAllRead, clearAll, markOneRead, removeOne } = useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread ? `Notifications — ${unread} unread` : 'Notifications'}
          className="relative text-muted-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              aria-hidden
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1',
                'text-[9px] font-black leading-none text-primary-foreground',
              )}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-xs font-black uppercase tracking-wider">Notifications</p>
          <div className="flex items-center gap-1">
            {notifs.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px] font-bold"
                  onClick={markAllRead}
                  disabled={unread === 0}
                >
                  <CheckCheck className="h-3 w-3" aria-hidden /> Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px] font-bold text-destructive"
                  onClick={clearAll}
                >
                  <Trash2 className="h-3 w-3" aria-hidden /> Clear
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto h-6 w-6 text-muted-foreground/40" aria-hidden />
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground/70">
                Save a search on the Discover page and we&apos;ll alert you when matching
                listings arrive.
              </p>
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'group flex items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0',
                  !n.read && 'bg-primary/5',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    n.read ? 'bg-muted-foreground/25' : 'bg-primary',
                  )}
                />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    markOneRead(n.id);
                    setOpen(false);
                    if (n.href) navigate(n.href);
                  }}
                >
                  <p className={cn('text-xs leading-snug', n.read ? 'font-medium' : 'font-bold')}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {timeAgo(n.createdAt)}
                  </p>
                </button>
                <button
                  aria-label={`Dismiss: ${n.title}`}
                  className="mt-0.5 rounded p-1 text-muted-foreground/0 transition-colors hover:text-muted-foreground group-hover:text-muted-foreground/60"
                  onClick={() => removeOne(n.id)}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
