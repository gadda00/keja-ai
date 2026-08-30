import { useEffect } from 'react'
import { SITE } from '@/config'

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

/**
 * Per-route document title + meta description + canonical + OG tags.
 * Keeps social shares and search snippets accurate on every route of the SPA.
 */
export function usePageMeta(title: string, description?: string) {
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
    const canonical = `${window.location.origin}${window.location.pathname}`
    upsertLink('canonical', canonical)
    upsertMeta('property', 'og:url', canonical)
  }, [title, description])
}
