/**
 * Area-level market intelligence (editorial research, upgraded as data grows).
 *
 * Split out of src/data/properties.ts (wave-15 inventory data-split): shell-graph
 * modules (trust scores, deal analyst, market intel) need ONLY these small
 * per-area strings — importing them from properties.ts dragged the entire
 * 87-listing inventory into the boot-critical shared chunk. The inventory now
 * loads lazily with the views that actually render listings.
 */
export const areaInsights: Record<string, { avgPricePerSqm: string; yield: string; note: string }> =
  {
    Kasarani: {
      avgPricePerSqm: 'KES 45k–65k',
      yield: '8.6–9.5%',
      note: 'Thika Road corridor growth — student and young-professional rentals near TRM and Garden City.',
    },
    Madaraka: {
      avgPricePerSqm: 'KES 70k–95k',
      yield: '8.8–9.6%',
      note: 'Compact, walkable and near Strathmore; one of the highest studio rental yields in Nairobi.',
    },
    CBD: {
      avgPricePerSqm: 'KES 80k–110k',
      yield: '8.0–9.0%',
      note: 'Commercial heart; office-to-residential conversions drive downtown rental demand.',
    },
    Eastleigh: {
      avgPricePerSqm: 'KES 60k–85k',
      yield: '8.2–9.0%',
      note: 'Dense trade hub with insatiable rental demand; mixed-use conversions dominate.',
    },
    Nanyuki: {
      avgPricePerSqm: 'KES 20k–40k',
      yield: '6.0–7.2%',
      note: 'Ranching and conservancy country; land plays and holiday lets beat pure rental yield.',
    },
    Milimani: {
      avgPricePerSqm: 'KES 40k–65k',
      yield: '7.2–8.4%',
      note: 'Premium Kisumu address near the lakefront; steady civil-servant and NGO tenant demand.',
    },
    Riverside: {
      avgPricePerSqm: 'KES 95k–130k',
      yield: '7.2–8.0%',
      note: 'Riverside Drive offices and embassies; corporate tenancies with longer leases.',
    },
    Ruaka: {
      avgPricePerSqm: 'KES 65k–90k',
      yield: '8.0–9.0%',
      note: 'Two Rivers catalyst; fastest-growing family suburb on Nairobi’s north-west edge.',
    },
    Runda: {
      avgPricePerSqm: 'KES 140k–190k',
      yield: '6.0–7.0%',
      note: 'Gigiri diplomatic belt; large family homes on half-acre plots, quiet resale market — premium stock trades at the top of the band.',
    },
    'Athi River': {
      avgPricePerSqm: 'KES 25k–45k',
      yield: '7.0–8.0%',
      note: 'EPZ and industrial logistics belt; land banking with genuine employment drivers.',
    },
    Diani: {
      avgPricePerSqm: 'KES 45k–80k',
      yield: '6.8–8.0%',
      note: 'Coastal holiday-let market; December–March occupancy drives annual returns.',
    },
    Kilimani: {
      avgPricePerSqm: 'KES 95k–120k',
      yield: '8.5–9.5%',
      note: 'Nairobi\u2019s densest premium rental corridor; strong expat demand.',
    },
    Westlands: {
      avgPricePerSqm: 'KES 100k–120k',
      yield: '8.5–9.5%',
      note: 'Most liquid submarket; commercial + residential mix.',
    },
    Karen: {
      avgPricePerSqm: 'KES 165k–195k',
      yield: '5–6%',
      note: 'Low-density premium suburb anchored by The Waterfront Karen town centre; capital growth over income — the reported 50.6-acre expansion is the corridor catalyst.',
    },
    Kantafu: {
      avgPricePerSqm: 'KES 3.5k–5.5k',
      yield: 'n/a (land)',
      note: 'Kangundo-corridor acreage market; electricity and water on site, development spreading out from the tarmac — a land-banking play with real infrastructure.',
    },
    Lavington: {
      avgPricePerSqm: 'KES 115k–130k',
      yield: '7.5–8.5%',
      note: 'Family suburb near international schools; long tenancies.',
    },
    Kileleshwa: {
      avgPricePerSqm: 'KES 105k–120k',
      yield: '8–9%',
      note: 'Leafy, central; popular with young professionals.',
    },
    Syokimau: {
      avgPricePerSqm: 'KES 65k–80k',
      yield: '8–9%',
      note: 'SGR + bypass corridor; fast appreciating.',
    },
    Kitengela: {
      avgPricePerSqm: 'KES 75k–90k',
      yield: '6–7%',
      note: 'Satellite town growth story; expressway spillover.',
    },
    Nyali: {
      avgPricePerSqm: 'KES 85k–92k',
      yield: '8–9.5%',
      note: 'Coast premium; corporate + holiday rental dual demand.',
    },
    Nakuru: {
      avgPricePerSqm: 'KES 55k–65k',
      yield: '6–7%',
      note: 'Fourth city; regional diversification play.',
    },
    Kisumu: {
      avgPricePerSqm: 'KES 75k–85k',
      yield: '8–9%',
      note: 'Lake-region hub; corporate furnished-housing demand.',
    },
  };
