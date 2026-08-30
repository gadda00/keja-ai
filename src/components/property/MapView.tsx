import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, TrendingUp } from 'lucide-react'
import type { Property } from '@/data/properties'
import { areaCoords } from '@/lib/searchStore'
import { formatKES } from '@/lib/format'
import { investmentScore } from '@/lib/investmentScore'
import { isRentalPrice } from '@/lib/finance'

interface Props {
  properties: Property[]
  onSelectArea?: (area: string) => void
}

/**
 * Stylized geographic map of Kenya property clusters — pure SVG, no map
 * dependency. Pins sized by inventory, coloured by median price tier;
 * clicking a cluster filters the list to that area.
 */
export default function MapView({ properties, onSelectArea }: Props) {
  const [hover, setHover] = useState<string | null>(null)

  const clusters = useMemo(() => {
    const byArea = new Map<string, Property[]>()
    for (const p of properties) {
      byArea.set(p.area, [...(byArea.get(p.area) ?? []), p])
    }
    const list = [...byArea.entries()].map(([area, props]) => {
      // Medians are computed per pricing scale — mixing monthly rents with
      // sale prices in one median produced meaningless figures.
      const sales = props.filter((p) => !isRentalPrice(p.price)).sort((a, b) => a.price - b.price)
      const rents = props.filter((p) => isRentalPrice(p.price)).sort((a, b) => a.price - b.price)
      const medianOf = (arr: Property[]) => (arr.length ? arr[Math.floor(arr.length / 2)].price : 0)
      const median = medianOf(sales) || medianOf(rents)
      return {
        area,
        props,
        median,
        rentMedian: medianOf(rents),
        avgScore: props.reduce((acc, p) => acc + investmentScore(p).overall, 0) / props.length,
        ...areaCoords(area, props[0]?.county),
      }
    })
    const maxMedian = Math.max(...list.map((c) => c.median), 1)
    return { list, maxMedian }
  }, [properties])

  // project Kenya bounds (lat 0.35..-4.9, lng 33.9..41.9) to viewBox
  const W = 760
  const H = 520
  const x = (lng: number) => ((lng - 33.9) / 8) * W
  const y = (lat: number) => ((0.35 - lat) / 5.25) * H

  const tier = (median: number) => {
    const r = median / clusters.maxMedian
    if (r > 0.66) return { fill: '#8A6B26', label: 'Premium' }
    if (r > 0.33) return { fill: '#B08F35', label: 'Mid-market' }
    return { fill: '#D4B04A', label: 'Emerging' }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cream to-white ring-1 ring-gold-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-100 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <MapPin className="h-4 w-4 text-gold-600" /> Map view
          <span className="font-medium text-ink-muted">— {clusters.list.length} areas, {properties.length} listings</span>
        </p>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-muted">
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#8A6B26]" /> Premium</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#B08F35]" /> Mid</span>
          <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#D4B04A]" /> Emerging</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-[420px] w-full sm:h-[520px]" role="img" aria-label="Map of Kenya with Keja property clusters">
        {/* stylized Kenya outline (simplified polygon) */}
        <path
          d="M60,170 L95,110 165,74 260,52 350,40 435,52 480,40 540,64 600,88 660,110 700,140 688,205 700,265 668,330 640,392 600,448 552,472 500,452 452,420 400,440 348,462 300,436 252,410 205,392 160,352 120,300 90,240 Z"
          fill="#F5F1E6"
          stroke="#D4B04A"
          strokeWidth="2"
          opacity="0.85"
        />
        {/* subtle grid */}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * (W / 10)} y1={0} x2={(i + 1) * (W / 10)} y2={H} stroke="#EAD8A0" strokeWidth="0.5" opacity="0.35" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={(i + 1) * (H / 7)} x2={W} y2={(i + 1) * (H / 7)} stroke="#EAD8A0" strokeWidth="0.5" opacity="0.35" />
        ))}

        {clusters.list.map((c) => {
          const t = tier(c.median)
          const size = 10 + Math.min(14, c.props.length * 2)
          const cx = x(c.lng)
          const cy = y(c.lat)
          const isHover = hover === c.area
          return (
            <g
              key={c.area}
              transform={`translate(${cx} ${cy})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(c.area)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectArea?.(c.area)}
              role="button"
              tabIndex={0}
              aria-label={`${c.area}: ${c.props.length} listings, median ${formatKES(c.median)}. Press Enter to filter this area.`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectArea?.(c.area)
                }
              }}
            >
              <circle r={size + (isHover ? 5 : 0)} fill={t.fill} opacity={isHover ? 0.42 : 0.22} />
              <circle r={size * 0.45} fill={t.fill} stroke="white" strokeWidth="1.5" className="focusable-pin" />
              <text y={-size - 8} textAnchor="middle" className="fill-ink" fontSize="13" fontWeight="700">
                {c.area}
              </text>
              <text y={size + 16} textAnchor="middle" className="fill-ink-muted" fontSize="11">
                {c.props.length} listing{c.props.length > 1 ? 's' : ''}
              </text>
              {isHover && (
                <g transform={`translate(0 ${size + 30})`}>
                  <rect x={-92} y={0} width={184} height={62} rx={10} fill="white" stroke={t.fill} strokeWidth="1.5" opacity="0.97" />
                  <text x={0} y={18} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-ink">
                    {t.label} · median {formatKES(c.median, { compact: true })}
                  </text>
                  <text x={0} y={36} textAnchor="middle" fontSize="11" className="fill-ink-muted">
                    avg Investment Score {c.avgScore.toFixed(1)}/10
                  </text>
                  <text x={0} y={52} textAnchor="middle" fontSize="10" fontWeight="600" className="fill-gold-700">
                    Click to filter this area
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
      <style>{`g[role="button"]:focus { outline: none; } g[role="button"]:focus circle { stroke: #8A6B26; stroke-width: 3; }`}</style>

      {hover && null /* tooltip handled inside SVG for perf */}

      <div className="grid gap-3 border-t border-gold-100 bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {clusters.list
          .slice()
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 3)
          .map((c) => (
            <Link
              key={c.area}
              to={`/properties?q=${encodeURIComponent(c.area)}`}
              className="card-luxe card-luxe-hover flex items-center justify-between gap-3 p-3.5"
            >
              <div>
                <p className="text-sm font-bold text-ink">{c.area}</p>
                <p className="text-xs text-ink-muted">{c.props.length} listings · median {formatKES(c.median, { compact: true })}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-bold text-gold-300">
                <TrendingUp className="h-3.5 w-3.5" /> {c.avgScore.toFixed(1)}
              </span>
            </Link>
          ))}
      </div>
    </div>
  )
}
