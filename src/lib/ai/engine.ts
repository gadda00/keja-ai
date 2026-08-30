/**
 * Keja AI — conversational engine (Phase 1 MVP brain).
 * Intent detection + property matching + investment math + lead qualification,
 * with explicit FACT / ESTIMATE / ASSUMPTION labelling (the trust differentiator).
 * Languages: English, Kiswahili, French (roadmap Step 15).
 */
import { PROPERTIES, Property, areaInsights, getProperty } from '@/data/properties'
import { analyzeInvestment, calculateMortgage, estimateMonthlyExpenses, isRentalPrice } from '@/lib/finance'
import { formatKES } from '@/lib/format'
import type { LanguageCode } from '@/config'

export interface AIResponse {
  text: string
  propertyIds?: string[]
  meta?: { label: 'FACT' | 'ESTIMATE' | 'ASSUMPTION'; text: string }[]
  quickReplies?: string[]
  action?: 'start-qualification' | 'open-calculator' | 'whatsapp'
}

/* ---------------------------------- utils ---------------------------------- */

const norm = (s: string) => s.toLowerCase().trim()

const AREA_ALIASES: Record<string, string> = {
  kilimani: 'Kilimani', 'yaya': 'Kilimani', prestige: 'Kilimani',
  westlands: 'Westlands', sarit: 'Westlands', westgate: 'Westlands',
  kileleshwa: 'Kileleshwa', lavington: 'Lavington', karen: 'Karen',
  runda: 'Runda', gigiri: 'Runda', 'un gigiri': 'Runda',
  syokimau: 'Syokimau', mlolongo: 'Syokimau', sgr: 'Syokimau',
  kitengela: 'Kitengela', 'athi river': 'Athi River', athi: 'Athi River', epz: 'Athi River',
  ruaka: 'Ruaka', 'two rivers': 'Ruaka', limuru: 'Ruaka',
  madaraka: 'Madaraka', strathmore: 'Madaraka',
  nyali: 'Nyali', mombasa: 'Nyali', bamburi: 'Nyali', coast: 'Nyali',
  nakuru: 'Nakuru', milimani: 'Milimani', kisumu: 'Kisumu', nanyuki: 'Nanyuki',
  kasarani: 'Kasarani', 'thika road': 'Kasarani', roysambu: 'Kasarani',
  eastleigh: 'Eastleigh', cbd: 'CBD', 'town': 'CBD', nairobi: 'Nairobi',
  kangemi: 'Ruaka', ngong: 'Ngong', kikuyu: 'Ruaka', kiambu: 'Ruaka',
}

const TYPE_ALIASES: Record<string, Property['type']> = {
  apartment: 'apartment', apartmento: 'apartment', flat: 'apartment', bedsitter: 'apartment',
  studio: 'apartment', house: 'villa', villa: 'villa', mansion: 'villa',
  townhouse: 'townhouse', maisonette: 'townhouse', bungalow: 'bungalow',
  land: 'land', plot: 'land', acre: 'land', 'kiwanja': 'land',
  commercial: 'commercial', office: 'commercial', shop: 'commercial', 'biashara': 'commercial',
}

interface ParsedQuery {
  areas: string[]
  type?: Property['type']
  maxBudget?: number
  minBudget?: number
  bedrooms?: number
  purpose?: 'buy' | 'rent' | 'invest'
}

function parseBudget(t: string): { max?: number; min?: number } {
  const mK = t.match(/(\d+(?:\.\d+)?)\s*(?:m|million|mil)\b/)
  const mK2 = t.match(/(\d+(?:,\d{3})*)\s*k\b/)
  const plain = t.match(/(?:under|below|max|budget of|upto|up to|less than|within)\s*(?:kes?|kshs?\.?|shillings?)?\s*(\d+(?:\.\d+)?)(m|million|k)?/)
  let max: number | undefined
  let min: number | undefined
  if (mK) max = parseFloat(mK[1]) * 1_000_000
  else if (mK2) max = parseFloat(mK2[1].replace(',', '')) * 1_000
  else if (plain) {
    const v = parseFloat(plain[1])
    const unit = plain[2]
    max = unit === 'm' || unit === 'million' ? v * 1_000_000 : unit === 'k' ? v * 1_000 : v
  }
  const rangeM = t.match(/(\d+(?:\.\d+)?)\s*(?:m|million)?\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(m|million)/)
  if (rangeM) {
    min = parseFloat(rangeM[1]) * 1_000_000
    max = parseFloat(rangeM[2]) * 1_000_000
  }
  return { max, min }
}

function parseQuery(t: string): ParsedQuery {
  const lower = ` ${norm(t)} `
  const areas: string[] = []
  for (const [alias, area] of Object.entries(AREA_ALIASES)) {
    if (lower.includes(` ${alias} `) || lower.includes(` ${alias},`) || lower.includes(`${alias} `)) {
      if (!areas.includes(area)) areas.push(area)
    }
  }
  let type: Property['type'] | undefined
  for (const [alias, tp] of Object.entries(TYPE_ALIASES)) {
    if (lower.includes(` ${alias}`)) {
      type = tp
      break
    }
  }
  const beds = t.match(/(\d+)\s*(?:br|bedroom|bd|bed)/i)
  const bedrooms = beds ? parseInt(beds[1]) : undefined
  let purpose: ParsedQuery['purpose']
  if (/\brent(al)?\b|kodi|renting/.test(lower)) purpose = 'rent'
  else if (/\binvest|roi|yield|airbnb|rental income|passive/.test(lower)) purpose = 'invest'
  else if (/\bbuy|purchase|own\b/.test(lower)) purpose = 'buy'
  const { max, min } = parseBudget(lower)
  return { areas, type, maxBudget: max, minBudget: min, bedrooms, purpose }
}

function matchProperties(q: ParsedQuery): Property[] {
  let list = [...PROPERTIES]
  if (q.areas.length) {
    const countyHit = q.areas.some((a) => a === 'Nairobi')
    list = list.filter((p) => q.areas.includes(p.area) || q.areas.includes(p.county) || (countyHit && p.county === 'Nairobi'))
  }
  if (q.type) list = list.filter((p) => p.type === q.type)
  if (q.bedrooms) list = list.filter((p) => (p.bedrooms ?? 0) >= q.bedrooms!)
  if (q.purpose === 'rent') list = list.filter((p) => p.purpose.includes('rent'))
  if (q.maxBudget) {
    list = list.filter((p) => (q.purpose === 'rent' ? (p.rentEstimate ?? p.price) <= q.maxBudget! : p.price <= q.maxBudget!))
  }
  if (q.minBudget && q.purpose !== 'rent') list = list.filter((p) => p.price >= q.minBudget!)
  // Trust-weighted ranking: score first, recency as tiebreaker
  return list.sort((a, b) => b.trustScore - a.trustScore || b.listedAt.localeCompare(a.listedAt)).slice(0, 4)
}

const propLine = (p: Property) =>
  `• **${p.title}** (${p.id}) — ${p.type === 'land' ? formatKES(p.price) : isRentalPrice(p.price) ? formatKES(p.price, { monthly: true }) : formatKES(p.price)} · Trust ${p.trustScore}/100`

/* ------------------------------- language packs ---------------------------- */

const L = {
  en: {
    greeting:
      'Habari! 👋 I\u2019m **Keja** — your AI real estate assistant, by Chacadom Investments.\n\nI can help you **find property**, **verify listings**, **analyse investments** (yields, ROI, projections) and connect you to trusted agents — across multiple agencies, so my recommendations are neutral.\n\nWhat are you looking for today?',
    fallback: 'I want to get this right. You can ask me things like:\n\n• "2 bedroom apartments in Kilimani under 15M"\n• "Is buying in Kitengela a good investment?"\n• "How do you verify listings?"\n• "What yield can I expect in Westlands?"\n• "I want to view the Karen villa"',
  },
  sw: {
    greeting:
      'Habari! 👋 Mimi ni **Keja** — msaidizi wako wa AI wa mali isiyohamishika, kutoka Chacadom Investments.\n\nNinaweza kukusaidia **kupata mali**, **kuthibitisha orodha**, **kuchambua uwekezaji** (mapato, ROI) na kukunganisha na mawakala wa kuaminika.\n\nUnatafuta nini leo?',
    fallback: 'Nikusaidieje? Unaweza uniuliza:\n\n• "Weka za kulala 2 Kilimani chini ya 15M"\n• "Je, uwekezaji Kitengela ni mzuri?"\n• "Mnawezaje kuthibitisha orodha?"',
  },
  fr: {
    greeting:
      'Bonjour ! 👋 Je suis **Keja** — votre assistant immobilier IA, de Chacadom Investments.\n\nJe peux vous aider à **trouver un bien**, **vérifier les annonces**, **analyser des investissements** (rendement, ROI) et vous mettre en relation avec des agents de confiance.\n\nQue recherchez-vous aujourd\u2019hui ?',
    fallback: 'Comment puis-je vous aider ? Vous pouvez me demander :\n\n• « Appartements 2 chambres à Kilimani moins de 15M »\n• « Est-ce un bon investissement à Kitengela ? »\n• « Comment vérifiez-vous les annonces ? »',
  },
}

/* ---------------------------------- engine --------------------------------- */

export class KejaAI {
  language: LanguageCode = 'en'
  qualificationState: { step: number; data: Record<string, string> } | null = null
  /** Last completed qualification — powers "show me matches" after the flow. */
  lastQualification: Record<string, string> | null = null

  setLanguage(lang: LanguageCode) {
    this.language = lang
  }

  respond(input: string): AIResponse {
    const t = norm(input)

    // Language switching
    if (/\b(kiswahili|swahili|kiswahili\s*please|sawa|sw)\b/.test(t) && /\b(speak|switch|change|badilisha|talk|kiswahili)\b/.test(t)) {
      this.language = 'sw'
      return { text: L.sw.greeting, quickReplies: ['Natafuta nyumba Kilimani', 'Uwekezaji Kitengela', 'English please'] }
    }
    if (/\b(french|français|francais)\b/.test(t)) {
      this.language = 'fr'
      return { text: L.fr.greeting, quickReplies: ['Appartement 2ch Kilimani', 'English please'] }
    }
    if (/\benglish\b/.test(t)) {
      this.language = 'en'
      return { text: 'Switched to English. How can I help you find home today?', quickReplies: ['Find property', 'Investment analysis', 'How verification works'] }
    }

    // Greetings
    if (/^(hi|hello|hey|habari|habari yako|jambo|hola|salut|good (morning|afternoon|evening)|niaje|sasa|mambo)\b/.test(t) || t === 'start' || t === 'get started') {
      return {
        text: L[this.language].greeting,
        quickReplies: ['Find me a home', 'Show investment deals', 'How do you verify listings?', 'I want to sell property'],
      }
    }

    // Qualification flow (if active)
    if (this.qualificationState) return this.continueQualification(input)

    // Start lead qualification — the 4-question matcher
    if (/(qualif|find me a home|help me find|match me|what should i buy|book me a viewing|start (the |my )?(process|journey)|guide me)/.test(t)) {
      return this.startQualification()
    }

    // Show matches from the last completed qualification
    if (/(show me (my )?matches|my matches|based on my profile|my budget)/.test(t) && this.lastQualification) {
      const q = parseQuery(`${this.lastQualification.interest ?? ''} ${this.lastQualification.budget ?? ''} ${this.lastQualification.timeline ?? ''}`)
      const matches = matchProperties({ ...q, purpose: /rent|kodi/i.test(this.lastQualification.budget ?? '') ? 'rent' : q.purpose })
      return this.searchAnswer(q, matches.length ? matches : PROPERTIES.slice(0, 4))
    }

    // Fresh inventory — newest listings first
    if (/(new (listings?|arrivals?|posting?s?|on the market)|fresh (listings?|stock)|just (listed|added)|latest (listings?|properties)|what'?s new)/.test(t)) {
      return this.newListingsAnswer()
    }

    // Trust / verification questions
    if (/(verify|verification|verified|trust|legit|scam|fraud|fake|ardhisasa|title|kuthibitisha|ghal|how do you (check|know)|safe)/.test(t)) {
      return this.trustAnswer(t)
    }

    // Tokenization questions
    if (/(tokeni[sz]|fractional|fraction of|tokeni[sz]ation|buy tokens|digital tokens|blockchain|ledger|kmy|kujua kuhusu tokens?)/.test(t)) {
      return this.tokenizeAnswer()
    }

    // KJAI / KPT — the two-token architecture
    if (/(kjai|kpt|utility token|property token|token economics|tokenomics|two.?token)/.test(t)) {
      return {
        text: 'Great question — this is the **two-token architecture** from the KEJA blueprint:\n\n**KJAI (utility token)** — the ecosystem utility layer, planning supply of 1,000,000,000. It powers premium AI access, fee benefits, developer services and ecosystem rewards. *Never* a speculative product — utility must be measurable and tied to real activity.\n\n**KPT (property investment tokens)** — project-specific digital representations of legally defined investor interests in property SPVs, funds or REITs. Example: a KSh 500M Nairobi property → 500,000 units at KSh 1,000 reference. Rights come from enforceable legal documents, not the token itself.\n\nThe core separation principle: company equity, platform utility and property interests stay **legally distinct**.',
        meta: [
          { label: 'FACT', text: 'Two-token model (KJAI utility + KPT property) is the documented blueprint architecture' },
          { label: 'ASSUMPTION', text: '1B KJAI supply is a planning figure pending legal & economic validation' },
        ],
        quickReplies: ['Open Keja Tokenize', 'How does the tokenization lifecycle work?', 'Is this regulated in Kenya?'],
      }
    }

    // Ecosystem / products
    if (/(ecosystem|keja home|keja invest|keja pro|keja manage|keja data|keja search|products?|platform family|what products)/.test(t)) {
      return {
        text: 'KEJA is a family of products built around **one intelligence layer**:\n\n🏠 **KEJA HOME** — discovery, search & guided decisions for buyers and renters\n📈 **KEJA INVEST** — investment analysis, scores & reports\n💼 **KEJA PRO** — agent CRM, lead qualification & analytics\n🏢 **KEJA MANAGE** — landlord tools, tenants & rental analytics\n📊 **KEJA DATA** — market intelligence & APIs for institutions\n🔎 **KEJA SEARCH** — natural-language property discovery\n✨ **KEJA AI ADVISOR** — that\u2019s me, across every product\n🪙 **KEJA TOKEN** — regulated tokenization infrastructure (demo)\n\nData feeds intelligence → intelligence improves discovery → discovery feeds transactions → transactions generate more data. The flywheel compounds.',
        meta: [{ label: 'FACT', text: 'Product family per the KEJA ecosystem architecture' }],
        quickReplies: ['Explore the ecosystem', 'Show me investment deals', 'How do I list property?'],
      }
    }

    // Investment Score
    if (/(investment score|score|rating|how do you rank|trust score|scoring)/.test(t)) {
      return {
        text: 'Two different scores — both transparent:\n\n**KEJA Investment Score™** (0–10): seven weighted factors — Rental Potential (22%), Capital Appreciation (18%), Location (16%), Price/Value (14%), Demand (12%), Risk (10%), Liquidity (8%). Every factor declares whether it\u2019s based on **FACT**, **ESTIMATE** or **ASSUMPTION**. You\u2019ll find it on every property page.\n\n**Trust Score** (0–100): verification-driven — title check, Ardhisasa match, photo authenticity, duplicate scan, pricing analysis and agent history.\n\nScores are decision-support tools, never guarantees. That\u2019s the discipline.',
        meta: [
          { label: 'FACT', text: 'Score weights and factors are published on every property detail page' },
          { label: 'ASSUMPTION', text: 'Location demand bands and type norms are illustrative baselines' },
        ],
        quickReplies: ['Show me top-scored properties', 'How does verification work?', 'Open the investment calculator'],
      }
    }

    // Account / sign in
    if (/(sign in|sign up|log ?in|register|account|google|session|create account)/.test(t)) {
      return {
        text: 'You can create a Keja account in seconds — **Continue with Google** or email. Your account unlocks:\n\n• Saved properties & searches\n• Your investment portfolio & Keja Tokenize holdings\n• Keja AI conversations that remember you\n• Viewing requests & WhatsApp updates\n• KEJA PRO tools if you\u2019re an agent\n\nSessions are role-based (user / agent / admin) and expire automatically. Privacy by design: your data stays on your device in this demo build.',
        meta: [{ label: 'FACT', text: 'RBAC + auto-expiring sessions per the KEJA security architecture' }],
        quickReplies: ['Sign in now', 'Tell me about the admin console', 'Find property first'],
      }
    }

    // Partners / global listings
    if (/(partner|agency partner|become a partner|list globally|global listings|international|diaspora|syndicat|feed)/.test(t)) {
      return {
        text: 'Keja acquires inventory **globally through five channels**:\n\n1️⃣ **Agent & agency partnerships** — free KEJA PRO tools in exchange for verified inventory\n2️⃣ **Developer direct deals** — off-plan & new builds with payment plans\n3️⃣ **Owner/landlord self-service** — free guided wizard, 24h review SLA\n4️⃣ **Cross-portal syndication** — XML/JSON feeds from diaspora corridors (UK, US, UAE)\n5️⃣ **API & data partnerships** — institutional and MLS-equivalent integrations\n\nEvery channel runs through duplicate detection, price-anomaly screening and completeness checks — trust by design, on every listing.',
        meta: [{ label: 'FACT', text: 'Five-channel supply strategy per the marketplace architecture' }],
        quickReplies: ['Become a partner', 'List my property', 'How does verification work?'],
      }
    }

    // Admin console
    if (/(admin|console|back ?office|moderation|review queue|who reviews)/.test(t)) {
      return {
        text: 'The **Admin Console** is the operating layer of the platform — restricted to administrator accounts:\n\n• **Overview** — KPIs, funnel, supply health\n• **Users** — role-based access management (admin / agent / user)\n• **Listings** — verification queue with anomaly flags & completeness scores\n• **Leads** — HOT/WARM/COLD CRM pipeline\n• **Partners & Feeds** — applications, feed connections, sync operations\n• **Audit Trail** — every critical action, recorded\n• **Settings** — review SLA, auto-approve thresholds, maintenance mode\n\nTry it: sign in as `admin@keja.ai` / `admin123` (demo credentials).',
        meta: [{ label: 'FACT', text: 'RBAC-gated console; audit trail per security architecture' }],
        quickReplies: ['Sign in as admin', 'How do listings get verified?', 'Tell me about partners'],
      }
    }

    // Compare areas — MUST run before the invest intent so "Kilimani vs
    // Westlands as an investment" answers the comparison, not a Kilimani brief.
    if (/(compare|vs|versus|better area|which area|difference between)/.test(t)) {
      return this.compareAnswer(input)
    }

    // Investment analysis for a specific area
    if (/(invest|roi|yield|return|appreciation|worth it|good deal|rental income|cash ?flow|mapato|uwekezaji)/.test(t)) {
      return this.investmentAnswer(input)
    }

    // Mortgage / financing
    if (/(mortgage|loan|financing|bank|deposit|interest rate|hire purchase|kcb|stanbic|installment)/.test(t)) {
      return this.mortgageAnswer()
    }

    // Process / legal / due diligence
    if (/(process|how do i buy|steps|legal|lawyer|due diligence|stamp duty|transfer|advocate|closing|buying process)/.test(t)) {
      return this.processAnswer()
    }

    // Viewing request
    if (/(view|viewing|visit|site visit|onja|open house|tour)/.test(t)) {
      return {
        text: 'I can arrange that for you. 🏡\n\nEvery viewing booked through Keja is escorted by a **verified agent**, and viewing fees (if any) can be held in **M-Pesa escrow** — released only after the viewing is confirmed. That\u2019s how we protect both sides.\n\nShall I start your viewing request? I\u2019ll just need your name and phone number.',
        quickReplies: ['Yes, book me a viewing', 'Which properties are available to view?'],
      }
    }

    // Sell / list property
    if (/(sell|list my|listing my|sell my|tenant|manage|management|kodi)/.test(t)) {
      return {
        text: 'I help two kinds of clients here:\n\n**Selling?** Your listing goes through our verification pipeline — title check, photo verification, price benchmarking — then appears with the *Verified by Keja* badge, which sells faster and at fairer prices.\n\n**Landlord?** Our management desk handles tenant sourcing, rent collection (M-Pesa), maintenance and monthly owner statements.\n\nWhich one sounds like you?',
        quickReplies: ['I want to sell', 'I need property management', 'Talk to a human'],
      }
    }

    // Ask about specific property by ID
    const byId = input.match(/KJA-\d{3}/i)
    if (byId) {
      const p = getProperty(byId[0].toUpperCase())
      if (p) return this.propertyAnswer(p)
    }

    // WhatsApp / human handoff
    if (/(human|agent|person|call me|talk to someone|whatsapp|sales team|msee wa kweli)/.test(t)) {
      return {
        text: 'Of course — real people back me up. 😊\n\nOur client desk is on WhatsApp and responds within business hours. HOT-lead requests (you\u2019re ready to transact) are routed to the relevant agency\u2019s sales team **immediately**.',
        action: 'whatsapp',
        quickReplies: ['Actually, keep chatting with Keja', 'Find property first'],
      }
    }

    // Thanks
    if (/(thank|asante|merci|appreciate|great|awesome|perfect|sawa|nzuri)/.test(t)) {
      return {
        text: 'Always a pleasure! 🌟\n\nRemember: I only recommend from **verified inventory**, and I\u2019ll always show you which numbers are facts, estimates, or assumptions. Anything else I can dig into?',
        quickReplies: ['Show me featured properties', 'Run an investment analysis', 'That\u2019s all for now'],
      }
    }

    // Default: treat as property search
    const q = parseQuery(input)
    const matches = matchProperties(q)
    if (matches.length && (q.areas.length || q.type || q.bedrooms || q.maxBudget || q.purpose)) {
      return this.searchAnswer(q, matches)
    }

    return { text: L[this.language].fallback, quickReplies: ['2BR Kilimani under 15M', 'Land in Kitengela', 'Investment analysis'] }
  }

  /* ------------------------------- sub-answers ------------------------------ */

  private searchAnswer(q: ParsedQuery, matches: Property[]): AIResponse {
    const criteria: string[] = []
    if (q.areas.length) criteria.push(`in ${q.areas.join(' or ')}`)
    if (q.type) criteria.push(q.type)
    if (q.bedrooms) criteria.push(`${q.bedrooms}+ bedroom`)
    if (q.maxBudget) criteria.push(`budget ≤ ${formatKES(q.maxBudget)}`)
    if (q.purpose === 'rent') criteria.push('for rent')

    const header = `Here\u2019s what I found ${criteria.join(', ')} — ranked by trust score: 🏆\n\n`
    const lines = matches.map(propLine).join('\n')
    const footer = matches.length
      ? `\n\nAll figures are **asking prices from verified agency listings** (FACT). Want the full breakdown on any of them — including yield estimates and trust details?`
      : ''
    return {
      text: header + lines + footer,
      propertyIds: matches.map((m) => m.id),
      quickReplies: matches.length
        ? [`Tell me more about ${matches[0].id}`, 'Run investment analysis', 'Book a viewing']
        : ['Widen my search', 'Show everything available'],
    }
  }

  private propertyAnswer(p: Property): AIResponse {
    const trust = p.trustScore >= 75 ? `✅ **Trust Score ${p.trustScore}/100** — Verified by Keja` : `⚠️ **Trust Score ${p.trustScore}/100** — ${p.trustSignals.some((s) => s.status === 'fail') ? 'FLAGGED by our trust layer. I do not recommend proceeding without extra due diligence.' : 'Under review.'}`
    const yieldLine =
      p.rentEstimate && p.grossYieldEstimate
        ? `\n\n📊 **Investment snapshot** (ESTIMATE based on current market rents):\n• Estimated market rent: ${formatKES(p.rentEstimate, { monthly: true })}\n• Gross yield: ~${p.grossYieldEstimate}%\n• Forecast appreciation: ~${p.appreciationForecast ?? 6}%/yr`
        : ''
    return {
      text: `**${p.title}** (${p.id})\n${p.area}, ${p.county} · ${formatKES(p.price)}${p.sizeSqm ? ` · ${p.sizeSqm} sqm` : ''}\nListed by ${p.agency}\n\n${trust}${yieldLine}\n\nShall I arrange a viewing or prepare a full investor report?`,
      propertyIds: [p.id],
      quickReplies: [`Book a viewing for ${p.id}`, 'Prepare investor report', 'Show me similar properties'],
    }
  }

  /** Newest verified inventory — the "fresh listings" surface. */
  private newListingsAnswer(): AIResponse {
    const fresh = [...PROPERTIES]
      .filter((p) => p.trustScore >= 75)
      .sort((a, b) => b.listedAt.localeCompare(a.listedAt))
      .slice(0, 4)
    return {
      text: `Fresh on the market — the newest verified listings: \u{1F195}\n\n${fresh.map(propLine).join('\n')}\n\nEvery new posting passes duplicate detection, price-band screening and completeness checks before it appears here. Want the full breakdown on any of them?`,
      propertyIds: fresh.map((p) => p.id),
      meta: [{ label: 'FACT', text: 'Sorted by listing date — verification status checked at publication.' }],
      quickReplies: ['Tell me more about the newest one', 'How do listings get verified?', 'Show investment deals'],
    }
  }

  private tokenizeAnswer(): AIResponse {
    return {
      text: "**Keja Tokenize** is our real-estate tokenization platform. 🪙\n\nWe convert institutional-grade Kenyan property into digital tokens — a **$10M building becomes 1,000,000 tokens at $10 each** — so you can own a fraction from **$100** and earn your share of rental income, paid monthly or quarterly.\n\nHow we keep it safe:\n\n• Every property sits in its own **SPV** (legal ring-fence)\n• Titles verified on **Ardhisasa** — zero encumbrances\n• **KYC/AML-gated** investors only\n• Ownership recorded on-chain (the Keja Ledger)\n• Structured with Kenya's **CMA regulatory sandbox** in mind\n\nLive offerings right now include Westlands Tower One (7.0% net yield), Kilimani Sky Residences (8.0%) and Karen Village Retail Court (funding).\n\nIt's currently a **demonstration environment** — tokens, valuations and distributions are simulated.",
      meta: [
        { label: 'FACT', text: 'Live demo offerings: 5 Nairobi assets, 7.0–8.0% net yields, $10 tokens.' },
        { label: 'ASSUMPTION', text: 'Yields are projections — not guaranteed — and tokens are illiquid early on.' },
      ],
      quickReplies: ['Open Keja Tokenize', 'How does KYC work?', 'What are the risks?'],
    }
  }

  private investmentAnswer(input: string): AIResponse {
    const q = parseQuery(input)
    const area = q.areas[0]
    if (area && areaInsights[area]) {
      const ins = areaInsights[area]
      const areaProps = PROPERTIES.filter((p) => p.area === area && !isRentalPrice(p.price)).slice(0, 2)
      const sample = areaProps[0]
      let calc = ''
      if (sample?.rentEstimate) {
        const r = analyzeInvestment({
          price: sample.price,
          furnishingCost: sample.type === 'apartment' ? Math.round(sample.price * 0.04) : 0,
          monthlyRent: sample.rentEstimate,
          occupancyPct: 85,
          monthlyExpenses: estimateMonthlyExpenses(sample.price, sample.rentEstimate, sample.sizeSqm),
          appreciationPct: sample.appreciationForecast ?? 7,
          rentGrowthPct: 5,
        })
        calc = `\n\n**Worked example — ${sample.title.split('—')[0].trim()} (${sample.id})**, assuming:\n• Purchase ${formatKES(sample.price)}, furnishing ${formatKES(Math.round(sample.price * 0.04))} (ASSUMPTION for new builds)\n• Rent ${formatKES(sample.rentEstimate, { monthly: true })} at 85% occupancy (ESTIMATE — current market)\n• Expenses ${formatKES(estimateMonthlyExpenses(sample.price, sample.rentEstimate, sample.sizeSqm), { monthly: true })} incl. service charge, 8% management, insurance & rates (ASSUMPTION — typical Nairobi costs)\n\n→ **Gross yield ${r.grossYield.toFixed(1)}% · Net yield ${r.netYield.toFixed(1)}% · Payback ~${r.paybackYears.toFixed(1)} yrs**`
      }
      return {
        text: `Let me give you the honest picture for **${area}**. 📊\n\nFACT — current market bands:\n• Average pricing: ${ins.avgPricePerSqm}\n• Typical gross rental yield: ${ins.yield}\n• ${ins.note}${calc}\n\nWant me to run these numbers on a specific listing, or compare ${area} with another area?`,
        meta: [
          { label: 'FACT', text: 'Market price bands reflect verified agency listings on Keja this quarter.' },
          { label: 'ESTIMATE', text: 'Yields depend on achieved rent and occupancy — your actuals may differ.' },
        ],
        quickReplies: ['Compare with another area', 'Run numbers on a specific listing', 'Open the investment calculator'],
      }
    }
    // General investment education
    const topYield = [...PROPERTIES].filter((p) => p.grossYieldEstimate && p.trustScore >= 85).sort((a, b) => (b.grossYieldEstimate ?? 0) - (a.grossYieldEstimate ?? 0)).slice(0, 3)
    return {
      text: `Here\u2019s how I think about investment property in Kenya (and anywhere, really):\n\n1️⃣ **Yield** — rental income vs total cost. Nairobi apartments: 8–9.5% gross is strong; land yields nothing but appreciates fastest (10–12%/yr in growth corridors).\n2️⃣ **Appreciation** — infrastructure drives value faster than hype: expressways, bypasses, SGR, SEZs, universities.\n3️⃣ **Liquidity** — can you exit? 2BR Kilimani/Westlands sells in weeks; unique luxury can take a year.\n4️⃣ **Trust** — a 12% \u201cyield\u201d on a flagged listing is worth nothing. I only vouch for verified stock.\n\nTop verified yield picks right now:\n${topYield.map((p) => `• ${propLine(p)} · ~${p.grossYieldEstimate}% gross`).join('\n')}\n\nWant a full 5/10-year projection on any of these?`,
      propertyIds: topYield.map((p) => p.id),
      quickReplies: ['Full projection on the top pick', 'What about land instead?', 'Open investment calculator'],
    }
  }

  private trustAnswer(t: string): AIResponse {
    if (/(ardhisasa|title|land search|deed)/.test(t)) {
      return {
        text: '**Ardhisasa & title checks** 📜\n\nFACT: Ardhisasa is Kenya\u2019s official digital land registry. For every listing, our verification layer cross-checks:\n\n• The title deed against registry records\n• Encumbrances — caveats, charges, cautions\n• Ownership vs the seller\u2019s ID\n• Whether the parcel is earmarked for public infrastructure\n\nEvery Keja listing shows its title status: **Verified / Pending / Flagged**. Never send money before an official search — and if a seller rushes you, that itself is a red flag.',
        meta: [{ label: 'FACT', text: 'Title-check status shown on each listing comes from documented searches, not guesses.' }],
        quickReplies: ['Show me fully verified listings', 'What fraud signals do you detect?', 'What about off-plan safety?'],
      }
    }
    return {
      text: 'Great question — trust is literally why I exist. 🛡️\n\nA tool owned by one agency can never tell you a listing looks suspicious. I sit **above multiple agencies**, so I can. Every listing on Keja carries a **Trust Score (0–100)** built from:\n\n✅ **Title check** — Ardhisasa cross-reference & encumbrance search\n✅ **Photo authenticity** — reverse-image matching catches recycled photos across agencies\n✅ **Duplicate scan** — the same unit listed 5 times is a classic scam pattern\n✅ **Pricing analysis** — is the price inside the market band, or a bait?\n✅ **Agent reputation** — phone-number history, complaint patterns, prior behaviour\n✅ **Listing velocity** — reposted 3× under different names = flagged\n\nOnly listings scoring 75+ earn the **Verified by Keja** badge. Anything under 60 is shown with a clear warning — we don\u2019t hide bad actors, we expose them.',
      quickReplies: ['Show a flagged example', 'What is Ardhisasa?', 'Show me only verified listings'],
    }
  }

  private mortgageAnswer(): AIResponse {
    const m = calculateMortgage({ propertyPrice: 10_000_000, depositPct: 20, annualRatePct: 13.5, termYears: 15 })
    return {
      text: '**Financing in Kenya — the honest version** 💳\n\nFACT (typical levels, always confirm with the bank):\n• Mortgage rates: **~10.5%–16.5%**, most banks around 13–14%\n• Minimum deposit: usually **10–20%** of price\n• Terms: up to **25 years**; most Kenyans take 10–15\n• Key lenders: KCB, Stanbic, Absa, NCBA, I&M, Co-op\n\n⚠️ Keja\u2019s caution (ASSUMPTION-FREE advice): at ~13.5%, a KES 10M property with a 20% deposit (KES ' + m.principal.toLocaleString() + ' loan) over 15 years costs about **' + formatKES(m.monthlyRepayment, { monthly: true }) + '**. That only makes sense if rent achievable is close to that, you expect strong appreciation, or your alternative use of cash earns less.\n\nMany smart Nairobi investors instead buy **one smaller cash unit** (e.g. Madaraka studio at KES 4.8M) and scale from rent. Want me to model both paths?',
      meta: [
        { label: 'FACT', text: 'Rate ranges reflect typical published Kenyan mortgage pricing.' },
        { label: 'ESTIMATE', text: 'Your offered rate depends on income, credit profile and bank — I can connect you to partners.' },
      ],
      quickReplies: ['Model both paths for me', 'Open the investment calculator', 'Connect me to a mortgage partner'],
    }
  }

  private processAnswer(): AIResponse {
    return {
      text: 'The Keja buying flow — 9 steps, no shortcuts: 🪜\n\n1️⃣ **Discover** — search verified inventory (I only recommend real stock)\n2️⃣ **Qualify** — budget, purpose, timeline (I help you self-qualify honestly)\n3️⃣ **Recommend** — ranked options with *why this fits* in plain language\n4️⃣ **Analyse** — yields, ROI, 5/10-year projections, risks\n5️⃣ **View** — escorted viewing, fees in M-Pesa escrow\n6️⃣ **Offer** — negotiated by the listing agency\u2019s verified agent\n7️⃣ **Legal & due diligence** — advocate-led: official land search, encumbrances, rates\n8️⃣ **Deposit** — held in escrow, released only on completion milestones\n9️⃣ **Transfer & keys** — stamp duty (4% of value for urban land), registration, done\n\nI stay with you the whole way — every step documented. Where would you like to start?',
      quickReplies: ['Start at step 1 — find property', 'I have a property in mind', 'What does due diligence cost?'],
    }
  }

  private compareAnswer(input: string): AIResponse {
    const q = parseQuery(input)
    const areas = q.areas.filter((a) => areaInsights[a])
    if (areas.length >= 2) {
      const [a, b] = areas
      const ia = areaInsights[a]
      const ib = areaInsights[b]
      return {
        text: `**${a} vs ${b}** — the side-by-side: ⚖️\n\n| | ${a} | ${b} |\n|---|---|---|\n| Pricing | ${ia.avgPricePerSqm} | ${ib.avgPricePerSqm} |\n| Gross yield | ${ia.yield} | ${ib.yield} |\n\n• **${a}:** ${ia.note}\n• **${b}:** ${ib.note}\n\nMy take (clearly labelled ESTIMATE): pick **${a}** for income, **${b}** for ${parseFloat(ia.yield) > parseFloat(ib.yield) ? 'growth' : 'income'} — and remember the best portfolio often holds both. Want listings in either?`,
        quickReplies: [`Show listings in ${a}`, `Show listings in ${b}`, 'Run yields on both'],
      }
    }
    return {
      text: 'Name any two areas and I\u2019ll compare pricing, yields and growth stories side-by-side. Popular comparisons:\n\n• Kilimani vs Westlands (rental income)\n• Kitengela vs Syokimau (satellite growth)\n• Karen vs Runda (premium land)\n• Land vs apartments (appreciation vs cashflow)',
      quickReplies: ['Kilimani vs Westlands', 'Land vs apartments', 'Kitengela vs Syokimau'],
    }
  }

  /* --------------------------- lead qualification ---------------------------- */

  startQualification(): AIResponse {
    this.qualificationState = { step: 1, data: {} }
    return {
      text: 'Perfect — let\u2019s do this properly. It takes 4 quick questions and helps me match you with exactly the right property (and agent, if you want one). 📝\n\n**Question 1 of 4:** What\u2019s your name?',
      action: 'start-qualification',
      quickReplies: [],
    }
  }

  private continueQualification(input: string): AIResponse {
    const state = this.qualificationState!
    const t = input.trim()
    switch (state.step) {
      case 1:
        state.data.name = t
        state.step = 2
        return { text: `Nice to meet you, ${t.split(' ')[0]}! 😊\n\n**Question 2 of 4:** What\u2019s your budget range? (e.g. "8–12M", "under 5M", "70k/month rent")` }
      case 2:
        state.data.budget = t
        state.step = 3
        return { text: `Noted — budget: ${t}. 💰\n\n**Question 3 of 4:** What are you looking for? A home to live in, an investment, or land?` }
      case 3:
        state.data.interest = t
        state.step = 4
        return { text: `Great. 🏡\n\n**Question 4 of 4:** Your timeline — ready now, 1–3 months, or still researching?` }
      case 4: {
        state.data.timeline = t
        const budgetT = state.data.budget || ''
        const budgetNum = parseFloat(budgetT.replace(/[^\d.]/g, '')) || 0
        const isHot = /now|immediate|1 month|ready|this month/i.test(t) || /ready to (buy|transact|move)/i.test(t)
        const isCold = /research|just looking|later|maybe|years/i.test(t)
        const temperature: 'HOT' | 'WARM' | 'COLD' = isHot ? 'HOT' : isCold ? 'COLD' : 'WARM'
        this.qualificationState = null
        this.lastQualification = { ...state.data, temperature }
        const budgetHint = budgetNum >= 5 ? ` With a budget around ${state.data.budget}, you have real options.` : ''
        return {
          text: `Thank you, ${state.data.name.split(' ')[0]}! Here\u2019s your profile: ✅\n\n• **Budget:** ${state.data.budget}\n• **Interest:** ${state.data.interest}\n• **Timeline:** ${state.data.timeline}\n• **Lead rating:** ${temperature}${temperature === 'HOT' ? ' — I\u2019ll flag our sales desk to reach out within hours.' : temperature === 'WARM' ? ' — I\u2019ll keep sending you matched listings and market updates.' : ' — no pressure; I\u2019m here whenever you\u2019re ready.'}${budgetHint}\n\nNow — shall I show you properties that match?`,
          meta: [{ label: 'FACT', text: `Profile captured: ${state.data.name} · ${temperature} lead · AI qualification flow` }],
          quickReplies: ['Show me matches', 'Save my profile', 'Talk to the sales team'],
        }
      }
      default:
        this.qualificationState = null
        return this.respond(input)
    }
  }
}

export const kejaAI = new KejaAI()
