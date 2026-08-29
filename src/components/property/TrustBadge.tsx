import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { trustTier } from '@/lib/format'

export default function TrustBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const tier = trustTier(score)
  const sizes = {
    sm: { badge: 'text-[10px] px-2 py-0.5 gap-1', icon: 'h-3 w-3' },
    md: { badge: 'text-[11px] px-3 py-1 gap-1.5', icon: 'h-3.5 w-3.5' },
  }[size]

  if (tier.tone === 'high' || tier.tone === 'good') {
    return (
      <span className={`badge-verified ${sizes.badge}`}>
        <ShieldCheck className={sizes.icon} />
        {tier.tone === 'high' ? 'Verified' : 'Verified'} · {score}
      </span>
    )
  }
  if (tier.tone === 'watch') {
    return (
      <span className={`inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 ${sizes.badge}`}>
        <ShieldQuestion className={sizes.icon} />
        Under Review · {score}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-700 ${sizes.badge}`}>
      <ShieldAlert className={sizes.icon} />
      Flagged · {score}
    </span>
  )
}
