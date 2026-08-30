/** Format Kenyan Shillings: KES 14.5M, KES 850,000, KES 65,000/mo */
export function formatKES(amount: number, opts?: { monthly?: boolean; compact?: boolean }): string {
  const suffix = opts?.monthly ? '/mo' : ''
  if (amount >= 1_000_000_000) return `KES ${(amount / 1_000_000_000).toFixed(1)}B${suffix}`
  if (amount >= 1_000_000 && opts?.compact !== false) {
    const m = amount / 1_000_000
    return `KES ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M${suffix}`
  }
  return `KES ${amount.toLocaleString('en-KE')}${suffix}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-KE')
}

export function trustTier(score: number): { label: string; tone: 'high' | 'good' | 'watch' | 'avoid' } {
  if (score >= 90) return { label: 'Highly Verified', tone: 'high' }
  if (score >= 75) return { label: 'Verified', tone: 'good' }
  if (score >= 60) return { label: 'Under Review', tone: 'watch' }
  return { label: 'Flagged — Exercise Caution', tone: 'avoid' }
}

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}
