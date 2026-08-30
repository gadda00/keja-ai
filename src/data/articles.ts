/** Insights — long-form guides (Keja market desk). Blocks render in ArticleDetail. */
export interface ArticleBlock {
  h?: string;
  p?: string;
  list?: string[];
  quote?: string;
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: 'Buying Guide' | 'Investing' | 'Diaspora' | 'Trust & Safety' | 'Market Notes';
  minutes: number;
  date: string;
  author: string;
  blocks: ArticleBlock[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'buying-property-in-kenya-step-by-step',
    title: 'Buying property in Kenya: the complete 2026 step-by-step guide',
    excerpt:
      'From offer to keys — every stage, cost and document in one honest walkthrough, including Ardhisasa transfer mechanics.',
    category: 'Buying Guide',
    minutes: 9,
    date: '2026-08-18',
    author: 'Keja Market Desk',
    blocks: [
      {
        p: 'A Kenyan property purchase is not complicated because the law is hostile — it is complicated because the sequence matters. Do the steps out of order and you pay for it: money committed before a title search, deposits before encumbrances are cleared, or a sale agreement drafted on an unverified search. This guide walks the process exactly as a careful buyer should run it, with the costs you should budget at each stage.',
      },
      { h: 'Step 1 — Define the mission before the property' },
      {
        p: 'Write down what the property must do for you: a home to live in for a decade, rental income from year one, land that doubles in five years, or a family holiday base that pays for itself in season. The mission determines the area shortlist, the acceptable yields, and your negotiation posture. Buyers who skip this step tour twenty properties and buy none — or buy the wrong one beautifully.',
      },
      { h: 'Step 2 — Verification before money' },
      {
        p: 'Every serious buyer runs a title search on Ardhisasa, the national land information system. You are checking four things: that the seller actually owns what they are selling, that the title is not encumbered by a bank charge, that land rates and rent are paid up to date, and that there are no cautions or caveats from third parties. This is precisely what Keja\u2019s verification layer automates on every listed property — but if you found the property elsewhere, do it yourself or pay a lawyer to do it. It costs a fraction of one percent of the purchase and saves whole fortunes.',
      },
      {
        list: [
          'Official search on Ardhisasa (or a manual search at the registry) — confirm registered owner matches the seller\u2019s ID',
          'Encumbrance check — bank charges, cautions, caveats must be discharged before transfer',
          'Rates and rent clearance certificate from the county government',
          'Approved plan check — the building or plot should match what the county approved',
          'Company sellers: board resolution and PIN certificate; deceased sellers: grant of probate',
        ],
      },
      { h: 'Step 3 — Offer, negotiation and the sale agreement' },
      {
        p: 'Once verification clears, make your offer in writing. Kenyan markets negotiate — listing prices are opening positions more often than fixed prices, particularly on resale property. When the price is agreed, your lawyer drafts (or reviews the seller\u2019s) sale agreement. The standard deposit is 10%, held by the seller\u2019s advocate pending completion. Never pay a deposit directly to a seller\u2019s personal account before a signed agreement exists.',
      },
      { h: 'Step 4 — The cost stack nobody quotes you upfront' },
      {
        list: [
          'Stamp duty: 4% of value in municipalities, 2% for rural land — the single biggest line item',
          'Legal fees: typically ~1.5% at this price band, scaled by the Law Society schedule',
          'Valuation: ~0.25%, usually required by lenders; cash buyers can skip it if confident',
          'Registration and misc: ~0.15% — small but real',
          'Mortgage buyers: bank processing (~0.5%) plus life and fire insurance requirements',
        ],
      },
      {
        p: 'On a KES 12M urban apartment, expect roughly KES 710,000 on top of the price — about 5.9%. Budget it before you fall in love with a property at the top of your range.',
      },
      { h: 'Step 5 — Transfer and registration' },
      {
        p: 'Stamp duty is paid to KRA and the transfer is registered on Ardhisasa, issuing a new title in your name. Clean files complete in two to six weeks; anything beyond that usually means a documentation problem on the seller\u2019s side — which is why the verification-first approach pays for itself in timeline as well as safety. Once the title issues, utilities transfer, keys hand over, and the property is legally yours.',
      },
      {
        quote:
          'The buyers who lose money in Kenya are almost never the victims of exotic fraud — they are the people who skipped a KES 500 search to save time on a KES 10,000,000 decision.',
      },
    ],
  },
  {
    slug: 'diaspora-buying-kenya-safely',
    title: 'Diaspora guide: buying Kenyan property from abroad without losing your shirt',
    excerpt:
      'The five failure modes that burn diaspora buyers — and the escrow, verification and management structures that prevent each one.',
    category: 'Diaspora',
    minutes: 8,
    date: '2026-08-12',
    author: 'Keja Market Desk',
    blocks: [
      {
        p: 'The Kenyan diaspora sends home billions of dollars a year, and real estate is the destination of choice. It is also the category where the most money is lost, because distance turns ordinary risks into silent ones: you cannot drive past the plot you bought, attend the site meeting, or knock on the door of the tenant who stopped paying. Every diaspora loss we see traces back to one of five failure modes — each has a known prevention.',
      },
      { h: 'Failure mode 1 — buying paper that does not exist' },
      {
        p: 'Fake title deeds and double-sold plots remain the classic. Prevention is mechanical, not clever: an official Ardhisasa search before any money moves, a lawyer on the ground acting for you alone (never the seller\u2019s lawyer "helping both sides"), and payment only into an escrow or advocate\u2019s client account that releases against registration of your title. If a seller resists escrow, you have learned everything you need for the price of one question.',
      },
      { h: 'Failure mode 2 — the relative who "manages" everything' },
      {
        p: 'Delegating unlimited authority to a relative is how diaspora buyers end up as financiers of other people\u2019s priorities. If you do use family — many do, happily — scope it in writing: what they may sign, what they may not, and a rule that no document touches land control boards or transfer instruments without your written approval. Better still, use a professional property manager with a fiduciary duty, monthly statements and an online dashboard you can read at 3am in your timezone.',
      },
      { h: 'Failure mode 3 — yield assumptions imported from another market' },
      {
        p: 'Diaspora buyers often anchor on the gross yields of their host country and forget the deductions that eat Kenyan net income: service charge on apartments, vacancy between tenants, management fees of 5–10%, insurance, land rates and income tax on rent. A 8.5% gross in Kilimani nets closer to 5.5–6.5% after the full stack, with occupancy assumptions doing most of the work. Keja\u2019s calculators label every number FACT, ESTIMATE or ASSUMPTION for exactly this reason — demand the same from anyone pitching you a deal.',
      },
      { h: 'Failure mode 4 — sending money on sentiment timelines' },
      {
        p: 'Pressure is the tell of a bad deal: "three other buyers", "price rises Friday", "send deposit today". Legitimate Kenyan transactions tolerate a week of verification. Structure your funds legally through your bank or a licensed remitter so the source-of-funds trail is clean for your conveyancer; this protects you at the transfer stage and at resale. Rushed money and clean money rarely travel together.',
      },
      { h: 'Failure mode 5 — buying the wrong asset from 7,000 km away' },
      {
        p: 'From abroad, a renders-and-price spreadsheet makes every plot look identical. On the ground, one plot is fifty metres off the tarmac and the next is behind a seasonal river. Insist on recent drone footage, geotagged photos, the exact beacon coordinates and — non-negotiable — an independent physical inspection before deposit. Keja\u2019s viewing service exists for precisely this: an escorted, documented inspection with a report you can read before you wire anything.',
      },
      {
        quote:
          'Distance is not the risk. Unverified distance is. Every structure in this guide is just a way of making the far away behave like the near.',
      },
    ],
  },
  {
    slug: 'kenyan-mortgages-2026-explained',
    title: 'Kenyan mortgages in 2026: rates, deposits and what banks actually approve',
    excerpt:
      'Why the average Kenyan mortgage rate sits where it does, how the 33% debt-to-income rule prices your ceiling, and how to cut years off the loan.',
    category: 'Market Notes',
    minutes: 7,
    date: '2026-08-05',
    author: 'Keja Market Desk',
    blocks: [
      {
        p: 'Kenyan mortgage rates have spent recent years in a band most buyers find uncomfortable — roughly 10.5% to 16.5% depending on lender, product and buyer profile — because banks price home loans off their cost of funds and the policy rate, not off wishful thinking. Understanding the mechanics changes how you should shop: the sticker rate matters, but the structure of the offer (deposit, term, fees, insurance bundling) often moves your total cost more than half a point of headline rate.',
      },
      { h: 'The 33% rule that prices your ceiling' },
      {
        p: 'Kenyan banks, following CBK consumer-protection guidance, generally cap the mortgage instalment near a third of your verifiable net income, after subtracting existing obligations. That single ratio converts your salary into a maximum property price faster than any brochure. Run it: net income KES 400,000 with KES 50,000 of other obligations leaves about KES 82,000 for an instalment; at 13.5% over 15 years with 20% down, that supports roughly a KES 7.5M principal — call it a KES 9.4M property. Keja\u2019s calculator has a dedicated Affordability mode that does this math with your numbers.',
      },
      { h: 'What banks actually scrutinise' },
      {
        list: [
          'Verified income: 6–12 months of bank statements and, for the employed, an introduction letter; for the self-employed, two to three years of accounts',
          'Existing obligations: existing loans cut your ceiling shilling-for-shilling of instalment',
          'The property itself: a bank valuation protects the bank, and gently protects you from overpaying',
          'Track record: a clean CRB record is table stakes; clear disputes before you apply, not after',
          'Citizenship and tenure: leasehold terms and land-control rules can shape which products apply',
        ],
      },
      { h: 'The lever most buyers ignore: the extra payment' },
      {
        p: 'At 13.5%, interest dominates the early years of a 15-year loan. One structured extra payment a year — or a rounding-up of the instalment — attacks principal directly and compounds quietly. On a KES 8M, 15-year loan, adding KES 15,000 to every instalment can clear the loan around three years early and save seven figures in interest. Our mortgage center computes your exact numbers; treat them as ESTIMATES and get binding quotes from at least three lenders — KCB, Stanbic, Absa, NCBA, I&M, Co-op and Stanchart all price differently for the same buyer.',
      },
      {
        quote:
          'A mortgage is not a product you are approved for. It is a math problem you are either winning or losing, one month at a time.',
      },
    ],
  },
  {
    slug: 'tokenization-explained-plain-language',
    title: 'Real estate tokenization, explained in plain language',
    excerpt:
      'What it actually means to own 500 tokens of a Nairobi tower — the SPV, the ledger, the distributions and the honest limits of the 2026 Kenyan regulatory scene.',
    category: 'Investing',
    minutes: 10,
    date: '2026-07-28',
    author: 'Keja Tokenize Desk',
    blocks: [
      {
        p: 'Strip away the vocabulary and tokenization is an old idea with new plumbing: take one large, indivisible, expensive asset — an apartment block — and represent ownership of it with many small, cheap, tradeable records. The records live on a shared ledger instead of a share certificate book. That is nearly all "token" means. Everything else that matters is the legal wrapping around the ledger, and that is where both the value and the danger live.',
      },
      { h: 'The SPV: the box that actually owns the building' },
      {
        p: 'In a serious structure, you never "own a fraction of a building" directly — buildings cannot be sliced. Instead, a special purpose vehicle (a company existing only to hold that one property) owns the building, and investors own tokens that represent shares in the SPV. The SPV collects rent, pays expenses and taxes, and distributes what remains. Your token is a claim on the SPV, and the SPV\u2019s paperwork is what a regulator, auditor or court would actually read. Keja Tokenize\u2019s demo mirrors this structure deliberately: every simulated property has a named SPV, a declared income and a jurisdiction, because those details are the difference between an investment product and a story.',
      },
      { h: 'Why fractions change the game' },
      {
        list: [
          'Entry price: $100 buys a slice of a $12M Westlands tower instead of the whole tower',
          'Diversification: the same capital spreads across four buildings and three neighborhoods',
          'Distributions: rental income arrives monthly or quarterly, proportional to tokens held',
          'Potential liquidity: on a regulated secondary market, exit is a trade, not a six-month sale process',
          'Transparency: every transaction on the ledger is timestamped and auditable',
        ],
      },
      { h: 'The honest limits — Kenya 2026 edition' },
      {
        p: 'Fractional ownership touches securities law, collective investment schemes and land control at once, and Kenya\u2019s framework is still maturing: the CMA has run a regulatory sandbox that admitted real-estate tokenization experiments, new virtual-asset rules have taken shape, and REIT structures already exist for pooled property. None of that yet equals a free market in tokenized Nairobi towers. What it means for a curious investor today: platforms (including ours) operate in demonstration or sandbox modes, no licensed secondary market for property tokens is liquid at scale yet, and anyone promising guaranteed token liquidity in Kenya today is ahead of the law. The correct posture is excitement about the structure, patience about the timeline.',
      },
      { h: 'How to read any tokenization pitch' },
      {
        p: 'Ask five questions: Who is the SPV and what does its constitutive document say about your rights? Where is the income declared and audited from? What is the total token supply and how was the token price derived? What KYC and AML screening gates entry? And where, legally, can you sell — today, not "soon"? If a pitch answers all five with documents rather than adjectives, it has earned a second meeting. Our Learn academy walks a full worked example with these exact checkpoints.',
      },
      {
        quote:
          'Tokenization does not make a bad building good. It makes a good building divisible — which is a completely different promise.',
      },
    ],
  },
  {
    slug: 'how-keja-verifies-listings',
    title: 'Inside the Keja trust layer: how a listing earns the Verified badge',
    excerpt:
      'Ardhisasa cross-checks, photo forensics, duplicate-signature detection and price anomaly bands — the five signals behind every trust score.',
    category: 'Trust & Safety',
    minutes: 6,
    date: '2026-07-20',
    author: 'Keja Verification Desk',
    blocks: [
      {
        p: 'Kenyan property portals have a trust problem with a body count: the same apartment photographed once and listed by four "agencies", prices 40% below market as bait, plots that belong to someone else entirely. Keja exists because of that problem, and the Verification layer is the product. Here is exactly what happens between a submission and the badge.',
      },
      { h: 'Signal 1 — Title cross-check against Ardhisasa' },
      {
        p: 'The anchor verification: the claimed ownership is checked against the national registry. If the name on the listing does not reconcile with the record — or the record shows a charge, caution or dispute — the listing never reaches the marketplace. This single check deletes the majority of fraudulent listings at source, because most fraud is lazy.',
      },
      { h: 'Signal 2 — Photo and duplicate forensics' },
      {
        p: 'Listings are fingerprinted: image similarity against our corpus catches the same unit re-listed under new paint, and recycled photo sets across "different" properties flag organized re-listing operations. Duplicates do not just waste your time — they are the medium through which phantom inventory is sold.',
      },
      { h: 'Signal 3 — Pricing anomaly bands' },
      {
        p: 'Every listing is scored against its area\u2019s price-per-sqm band for comparable type and tenure. Deep under-pricing is treated as aggressively as over-pricing: a KES 6M Kilimani apartment "priced to sell today" is either a scam, a distress sale with a story you must hear, or a mis-listing. In all three cases the correct response is a flag, not a bargain badge.',
      },
      { h: 'Signal 4 — Listing velocity and agent reputation' },
      {
        p: 'Accounts that list twenty properties in a week, delist, and relist under new names carry a signature. Agent reputation compounds with every completed, verified transaction — and the queue, not the seller, decides what publishes.',
      },
      { h: 'Signal 5 — Human review before publication' },
      {
        p: 'Machines score; the verification desk decides. Every submission lands in a queue with its completeness score and anomaly flags, and a human being approves, rejects or flags it. Our admin console exposes this whole pipeline in the open — including rejected listings — because a trust product that hides its rejections is asking you to trust marketing instead of mechanics.',
      },
      {
        quote:
          'We show you flagged listings on purpose, clearly labelled. A marketplace that only shows you what it approved is asking for faith. We prefer to show you the machinery.',
      },
    ],
  },
  {
    slug: 'nairobi-growth-corridors-2026',
    title: 'Nairobi\u2019s growth corridors 2026: where infrastructure is quietly repricing land',
    excerpt:
      'Expressway spillovers, SGR satellite towns and the Ruaka–Kileleshwa value gradient — a data-grounded tour of where the tarmac is going next.',
    category: 'Market Notes',
    minutes: 8,
    date: '2026-07-10',
    author: 'Keja Market Desk',
    blocks: [
      {
        p: 'Nairobi does not grow in circles; it grows along infrastructure. Every major repricing of the last two decades followed a road, a rail line or a bypass — and the pattern is repeating now with unusual clarity. This tour reads the corridors the way an underwriter does: infrastructure committed, absorption visible, prices not yet fully adjusted.',
      },
      { h: 'The value gradient: Ruaka and Kileleshwa' },
      {
        p: 'Westlands and Kilimani earn their premium on liquidity and rental depth, but the adjacent value pockets tell the more interesting story. Ruaka rides the Two Rivers / Limuru Road axis with family-stock apartments at roughly 65–75% of Kilimani pricing per sqm, and Kileleshwa offers the same walk-to-everything utility one traffic light away from the premium postcode. For income investors, the yield math often beats the famous names because entry prices lag rents by a year or two.',
      },
      { h: 'The satellite corridor: Kitengela–Syokimau–Athi River' },
      {
        p: 'The expressway and the SGR freight economy did something old maps cannot show: they stitched the southeast satellite belt into the city\u2019s economic engine. Kitengela absorbs Nairobi overspill family demand; Syokimau trades on airport and rail access; Athi River carries industrial and logistics expansion — EPZ growth, warehousing and the standard-trade spine to Mombasa. Land banking here is a patience trade: entry prices still reflect "far away" while commute times increasingly do not.',
      },
      { h: 'The northern stretch: Ruaka edge, Kiambu corridor and beyond' },
      {
        p: 'The northwest corridor continues to extend value outward along the Northern Bypass and the Kiambu Road spines — but with thinner rental demand as you leave the ring. The discipline in the north is stricter: buy where schools, malls and hospitals already operate, not where a brochure says they will. Existing amenity is the difference between a growth corridor and a field.',
      },
      { h: 'How to stress-test any corridor claim' },
      {
        list: [
          'Committed infrastructure beats proposed: tarmac under construction, not renders',
          'Absorption evidence: occupied units, trading shops, school waiting lists',
          'Price-per-sqm gap: the opportunity is the gap between the corridor\u2019s rent and its price',
          'Exit liquidity: who buys from you in five years, and why',
        ],
      },
      {
        p: 'Every band in this note is an ESTIMATE drawn from marketplace data, and corridors stall — politics, interest rates and county plans all bite. The method outlives the moment: follow committed infrastructure, verify title, buy the gap. Ask Keja to run live yields on any area in this note and the numbers will speak for themselves.',
      },
    ],
  },
];
