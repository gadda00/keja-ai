export const SITE = {
  name: 'Keja.ai',
  fullName: 'Keja.ai by Chacadom',
  tagline: 'Intelligent Real Estate. Verified Trust.',
  secondaryTagline: 'Smarter Investments.',
  parent: 'Chacadom Investments',
  whatsapp: '254700123456',
  email: 'hello@keja.ai',
  phone: '+254 700 123 456',
  offices: 'Westlands, Nairobi · Kenya',
  founded: '2026',
  swahiliNote: '"Keja" is Swahili for home.',
}

export const whatsappLink = (message?: string) =>
  `https://wa.me/${SITE.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'fr', label: 'Français' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']
