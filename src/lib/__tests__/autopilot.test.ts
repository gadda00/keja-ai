/**
 * Auto-Pilot pipeline regression tests (Node-side modules).
 * Guards the round-2 criticals: signature graveyard (feed re-publish loop),
 * price-0 quality-gate ordering, dedupe behaviour.
 */
import { describe, it, expect } from 'vitest'
// @ts-expect-error — Node-side pipeline modules (.mjs, no type declarations by design)
import { qualityScore } from '../../../scripts/auto-listings/quality.mjs'
// @ts-expect-error — Node-side pipeline modules (.mjs, no type declarations by design)
import { dedupe, signature } from '../../../scripts/auto-listings/dedupe.mjs'

const baseListing = {
  id: 'KJA-A9999',
  title: 'Test 2-Bedroom Apartment in Kilimani',
  type: 'apartment',
  area: 'Kilimani',
  county: 'Nairobi',
  price: 12000000,
  sizeSqm: 100,
  bedrooms: 2,
  bathrooms: 2,
  description:
    'A well-presented apartment in Kilimani offering bright space and disciplined pricing. Interiors are clean and neutral. Benchmarked against comparable stock, defensible entry pricing.',
  amenities: ['Lift access', 'Borehole water', '24/7 security', 'Gym'],
  images: ['/images/props/apartment_0.jpg', '/images/props/apartment_1.jpg', '/images/props/interior_0.jpg'],
  agency: 'Test Partners',
  agent: { name: 'Test Agent', phone: '+254 700 000 000' },
  listedAt: '2026-08-30T10:00:00Z',
  auto: { source: 'feed:json:test.json', areaPpsmBand: [95000, 145000], areaAcreBand: [80, 160] },
}

describe('quality gate (round-2 criticals)', () => {
  it('hard-fails price=0 listings — never auto-publishes them', () => {
    const q = qualityScore({ ...baseListing, price: 0 })
    expect(q.route).toBe('reject')
    const priceCheck = q.checks.find((c: { label: string; status: string }) => c.label === 'Price-band screen')
    expect(priceCheck?.status).toBe('fail')
  })

  it('warns (not publishes) on a sale listing with no size — price screen skipped', () => {
    const q = qualityScore({ ...baseListing, sizeSqm: 0 })
    expect(q.route).not.toBe('publish')
    const priceCheck = q.checks.find((c: { label: string; status: string }) => c.label === 'Price-band screen')
    expect(priceCheck?.status).toBe('warn')
  })

  it('publishes a complete, in-band listing', () => {
    const q = qualityScore(baseListing)
    expect(q.route).toBe('publish')
    expect(q.score).toBeGreaterThanOrEqual(80)
  })

  it('flags bait pricing far below the area band', () => {
    const q = qualityScore({ ...baseListing, price: 2000000 }) // 20k/sqm vs 95k floor
    expect(q.route).toBe('reject')
  })

  it('applies acre-band screening to land', () => {
    const land = {
      ...baseListing,
      type: 'land',
      title: 'Test Acreage in Kitengela',
      area: 'Kitengela',
      price: 7000000, // 3.5M/acre for 2 acres — inside the 2.5–8M band
      sizeSqm: 8094, // 2 acres
      auto: { ...baseListing.auto, areaPpsmBand: [30000, 55000], areaAcreBand: [2.5, 8] },
    }
    expect(qualityScore(land).route).toBe('publish')
    const bait = { ...land, price: 400000 } // 0.2M/acre — far below the 2.5M floor
    expect(qualityScore(bait).route).toBe('reject')
  })
})

describe('dedupe + signature graveyard (round-2 critical A1)', () => {
  it('hard-skips candidates whose signature is in the graveyard — even after eviction', () => {
    const sig = signature(baseListing)
    const { unique, dupes } = dedupe([baseListing], [], [sig])
    expect(unique).toHaveLength(0)
    expect(dupes[0]?.reason).toContain('graveyard')
  })

  it('still dedupes against live inventory with title overlap', () => {
    const live = [{ ...baseListing, id: 'KJA-A0001', listedAt: '2026-08-01T00:00:00Z' }]
    const fresh = { ...baseListing, id: 'KJA-A0099' }
    const { unique, dupes } = dedupe([fresh], live, [])
    expect(unique).toHaveLength(0)
    expect(dupes).toHaveLength(1)
  })

  it('allows genuinely different listings through', () => {
    const different = { ...baseListing, id: 'KJA-A0098', title: 'Test 4-Bedroom Villa in Karen', type: 'villa', area: 'Karen', price: 45000000, bedrooms: 4 }
    const { unique } = dedupe([different], [baseListing], [signature(baseListing)])
    expect(unique).toHaveLength(1)
  })
})
