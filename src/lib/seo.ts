import { useEffect } from 'react'
import { SITE, asset } from '@/config'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const JSONLD_ID = 'keja-route-jsonld'

/** Replace (or remove) the per-route JSON-LD structured-data block. */
function setRouteJsonLd(data: object | object[] | null) {
  document.getElementById(JSONLD_ID)?.remove()
  if (!data) return
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = JSONLD_ID
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

export interface PageMetaOptions {
  title: string
  description?: string
  /** Route-specific OG image (absolute or asset() path). */
  image?: string
  /** robots override — e.g. 'noindex' for soft-404 / private pages. */
  robots?: string
  /** One structured-data object (or array) for this route. */
  jsonLd?: object | object[] | null
}

/**
 * Per-route document title + meta description + canonical + OG/Twitter tags
 * + optional route-scoped JSON-LD structured data. Keeps social shares and
 * search snippets accurate on every route of the SPA.
 */
export function usePageMeta(title: string, description?: string, options?: Omit<PageMetaOptions, 'title' | 'description'>) {
  useEffect(() => {
    const full = title.includes(SITE.name) ? title : `${title} — ${SITE.name}`
    document.title = full
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
      upsertMeta('name', 'twitter:description', description)
    }
    upsertMeta('property', 'og:title', full)
    upsertMeta('name', 'twitter:title', full)
    if (options?.image) {
      const img = options.image.startsWith('http') ? options.image : `${window.location.origin}${asset(options.image.replace(/^\//, ''))}`
      upsertMeta('property', 'og:image', img)
      upsertMeta('name', 'twitter:image', img)
      upsertMeta('property', 'og:image:width', '1200')
      upsertMeta('property', 'og:image:height', '630')
    }
    if (options?.robots) upsertMeta('name', 'robots', options.robots)
    else document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.remove()
    const canonical = `${window.location.origin}${window.location.pathname}`
    upsertLink('canonical', canonical)
    upsertMeta('property', 'og:url', canonical)
    setRouteJsonLd(options?.jsonLd ?? null)
  }, [title, description, options?.image, options?.robots, options?.jsonLd])
}

/* ------------------------- structured data builders ------------------------ */

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `https://gadda00.github.io${it.path}`,
    })),
  }
}

export function realEstateListingJsonLd(p: {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  area: string
  county: string
  bedrooms?: number
  bathrooms?: number
  sizeSqm: number
  agency: string
  listedAt: string
  monthly?: boolean
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    description: p.description,
    url: `https://gadda00.github.io/keja-ai/properties/${p.id}`,
    datePosted: p.listedAt,
    image: p.images.map((img) => (img.startsWith('http') ? img : `https://gadda00.github.io/keja-ai${img.replace('/keja-ai', '')}`)),
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'KES',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'RealEstateAgent', name: p.agency },
    },
    ...(p.bedrooms ? { numberOfRooms: p.bedrooms } : {}),
    ...(p.bathrooms ? { numberOfBathroomsTotal: p.bathrooms } : {}),
    floorSize: { '@type': 'QuantitativeValue', value: p.sizeSqm, unitCode: 'MTK' },
    address: {
      '@type': 'PostalAddress',
      addressLocality: p.area,
      addressRegion: p.county,
      addressCountry: 'KE',
    },
  }
}

export function articleJsonLd(a: { title: string; description: string; slug: string; publishedAt: string; author: string; image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    datePublished: a.publishedAt,
    author: { '@type': 'Organization', name: a.author },
    publisher: { '@type': 'Organization', name: SITE.parent },
    mainEntityOfPage: `https://gadda00.github.io/keja-ai/insights/${a.slug}`,
  }
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}
