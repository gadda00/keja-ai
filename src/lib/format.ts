/** Format Kenyan Shillings: KES 14.5M, KES 850,000, KES 65,000/mo */
export function formatKES(amount: number, opts?: { monthly?: boolean; compact?: boolean }): string {
  const suffix = opts?.monthly ? '/mo' : '';
  if (amount >= 1_000_000_000) return `KES ${(amount / 1_000_000_000).toFixed(1)}B${suffix}`;
  if (amount >= 1_000_000 && opts?.compact !== false) {
    const m = amount / 1_000_000;
    return `KES ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M${suffix}`;
  }
  return `KES ${amount.toLocaleString('en-KE')}${suffix}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-KE');
}

// KEJA Trust Score interpretation bands (platform standard, proposal §4).
// 90–100 Exceptional · 80–89 Strong · 70–79 Moderate · 60–69 High Risk · <60 Significant DD.
export function trustTier(score: number): {
  label: string;
  tone: 'high' | 'good' | 'watch' | 'avoid';
} {
  if (score >= 90) return { label: 'Exceptional', tone: 'high' };
  if (score >= 80) return { label: 'Strong', tone: 'high' };
  if (score >= 70) return { label: 'Moderate', tone: 'good' };
  if (score >= 60) return { label: 'High Risk', tone: 'watch' };
  return { label: 'Requires Significant Due Diligence', tone: 'avoid' };
}

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}
