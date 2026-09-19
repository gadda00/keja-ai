'use client';
/**
 * My buying journey (wave 20) — the guided purchase path, per account.
 *
 * The Buyers & Sellers portal card promises a "guided purchase path"; Ask
 * Keja could *describe* the nine steps but the buyer had nowhere to walk
 * them. This tab is that path: every step links to the surface that does
 * the job, progress persists on the device, and the next step is always
 * the highlighted one.
 */
import { Milestone, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { activeStep, BUYING_STEPS, useJourneyStore } from '@/lib/journeyStore';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

export function BuyingJourney() {
  const { state, toggle, reset, progressPct } = useJourneyStore();
  const next = activeStep(state);

  return (
    <div className="space-y-4">
      {/* progress header */}
      <div className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
              <Milestone className="h-4 w-4 text-gold" aria-hidden /> The nine-step Keja buying flow
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {progressPct === 0
                ? 'Start at discovery — every step links to the tool that does it.'
                : progressPct === 100
                  ? 'Complete. Your passport trail is on this device — start the next one anytime.'
                  : `Next: ${next.label}.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tabular-nums text-primary">{progressPct}%</span>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={reset}>
              <RotateCcw className="mr-1 h-3 w-3" aria-hidden /> Restart
            </Button>
          </div>
        </div>
        <Progress value={progressPct} className="mt-4 h-2" aria-label="Buying journey progress" />
      </div>

      {/* the steps */}
      <ol className="grid gap-3 sm:grid-cols-2">
        {BUYING_STEPS.map((s, i) => {
          const done = !!state[s.id];
          const isNext = s.id === next.id && !done;
          return (
            <li
              key={s.id}
              className={cn(
                'flex flex-col gap-2 rounded-2xl border p-4 transition-colors',
                done && 'border-primary/40 bg-primary/5',
                isNext && 'border-gold/50 ring-1 ring-gold/30',
                !done && !isNext && 'bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => toggle(s.id)}
                  className="flex items-start gap-3 text-left"
                  aria-pressed={done}
                  aria-label={`Mark "${s.label}" ${done ? 'not done' : 'done'}`}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black',
                      done
                        ? 'bg-primary text-primary-foreground'
                        : isNext
                          ? 'bg-gold text-gold-foreground'
                          : 'bg-accent text-muted-foreground',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <div>
                    <p className={cn('text-sm font-bold', done && 'text-primary')}>{s.label}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.hint}</p>
                  </div>
                </button>
                {isNext && (
                  <Badge variant="outline" className="shrink-0 border-gold/60 text-[9px] font-bold text-gold-foreground">
                    Next
                  </Badge>
                )}
              </div>
              <Button
                variant={isNext ? 'default' : 'outline'}
                size="sm"
                className="mt-auto h-8 w-full text-xs font-bold"
                onClick={() => navigate(s.to)}
              >
                {s.action}
              </Button>
            </li>
          );
        })}
      </ol>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Progress is stored on this device, per browser. Nothing here is legal or financial
        advice — the steps point at the platform's own tools and their honest labels.
      </p>
    </div>
  );
}
