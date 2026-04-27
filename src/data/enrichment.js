// Enrichment data merged into ITEMS — addresses, images, quotes, tips, comparison options
export const ENRICHMENT = {
  // ═══ TRANSPORT — comparison options ═══
  'tr1': {
    options: [
      { name: 'Iberia', detail: 'Direct MAD→MAH, ~1h30', price: '~$140/pp', url: 'https://www.iberia.com' },
      { name: 'Ryanair', detail: 'Direct, budget carrier', price: '~$80/pp', url: 'https://www.ryanair.com' },
      { name: 'Vueling', detail: 'Direct, IAG group', price: '~$100/pp', url: 'https://www.vueling.com' },
    ],
    tips: ['July is peak Menorca — book NOW', 'Ryanair has strictest baggage rules (cabin bag only free)', 'Iberia includes checked bag on most fares'],
  },
  'tr2': {
    options: [
      { name: 'Ryanair', detail: 'Direct MAH→AGP, ~1h45', price: '~$95/pp', url: 'https://www.ryanair.com' },
    ],
    tips: ['Only Ryanair flies this route direct', 'Book 60+ days out for best price'],
  },
  'tr3': {
    options: [
      { name: 'Ryanair', detail: 'Direct AGP→FCO, ~2h35', price: '~$80–130/pp', url: 'https://www.ryanair.com' },
      { name: 'Vueling', detail: 'Direct, more legroom', price: '~$100–150/pp', url: 'https://www.vueling.com' },
      { name: 'Wizz Air', detail: 'Direct, ultra-low-cost', price: '~$60–110/pp', url: 'https://wizzair.com' },
      { name: 'Skyscanner', detail: 'Compare all airlines', price: 'Best price', url: 'https://www.skyscanner.com/transport/flights/agp/fco/' },
    ],
    tips: ['Peak summer — book 2+ months ahead', 'Fiumicino (FCO) has train to Trastevere station (€8, 30min)', 'Ciampino (CIA) is farther — avoid if possible'],
  },
  'tr4': {
    options: [
      { name: 'Italo', detail: 'Frecciarossa, 1h30, modern', price: '~$25–55/pp', url: 'https://www.italotreno.it' },
      { name: 'Trenitalia', detail: 'Frecciarossa, 1h30', price: '~$25–55/pp', url: 'https://www.trenitalia.com' },
    ],
    tips: ['Book 60+ days ahead for €19 "Super Economy" fare', 'Roma Termini → Firenze SMN direct', 'Italo often cheaper than Trenitalia for same route'],
  },
  'tr5': {
    options: [
      { name: 'DiscoverCars', detail: 'Compact, full coverage included', price: '~$570/8 days', url: 'https://www.discovercars.com/italy/florence' },
      { name: 'AutoEurope', detail: 'Compare multiple suppliers', price: '~$500–650/8 days', url: 'https://www.autoeurope.com' },
      { name: 'Hertz (SMN)', detail: 'Direct at station', price: '~$600–700/8 days', url: 'https://www.hertz.com' },
      { name: 'Europcar (SMN)', detail: 'Direct at station', price: '~$550–680/8 days', url: 'https://www.europcar.com' },
    ],
    tips: [
      'SAME pickup + dropoff (Florence SMN) = no one-way fee',
      'Book 30+ days ahead — July prices spike',
      'Get FULL COVERAGE insurance — Italian roads + ZTL fines',
      'Compact car essential for narrow Tuscan/lake roads',
      'ZTL WARNING: All walled towns have camera fines (€100–300). Park OUTSIDE walls at Parcheggio (P) signs',
    ],
  },
  'tr6': {
    options: [
      { name: 'Vueling', detail: 'VY6540, direct VCE→MAD, ~2h30', price: '~$100–160/pp', url: 'https://www.vueling.com' },
      { name: 'Iberia', detail: 'IB3199, direct, checked bag included', price: '~$130–180/pp', url: 'https://www.iberia.com' },
      { name: 'Skyscanner', detail: 'Compare all options', price: 'Best price', url: 'https://www.skyscanner.com/transport/flights/vce/mad/' },
    ],
    tips: ['Need to arrive Madrid by ~7pm for next-day Lima flight at 11am', 'Venice Marco Polo (VCE) — take water bus to airport from Piazzale Roma'],
  },

  // ═══ STAYS ═══
  's-rome1': {
    imageUrl: 'https://images.unsplash.com/photo-1529290130-4ca3753253ae?w=600&h=300&fit=crop',
    highlights: ['Family-run since 1923', "Near Campo de' Fiori — Rome's liveliest piazza", 'Walk to Pantheon, Navona, Trastevere in 10 min', 'Breakfast included'],
  },
  's-rome2': {
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=300&fit=crop',
    highlights: ["Via Giulia — one of Rome's most elegant streets", 'Rooftop terrace with Palazzo Farnese views', 'Design hotel, IHG flagship'],
  },
  's-rome4': {
    imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&h=300&fit=crop',
    highlights: ['Secret garden between Spanish Steps and Piazza del Popolo', 'Rocco Forte group', 'Forbes 5-Star'],
  },
  's-flo1': {
    imageUrl: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=600&h=300&fit=crop',
    highlights: ['Booking.com 9.2 Wonderful', 'Walk to Duomo and Uffizi', 'Family-run, breakfast included', 'Most consistent mid-range pick in Florence'],
  },
  's-mon1': {
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop',
    highlights: ["Inside medieval walls on Piazza San Francesco", "Panoramic Val d'Orcia valley views"],
  },
  's-vd1': {
    imageUrl: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=600&h=300&fit=crop',
    highlights: ['Working family farm — their own wine, pecorino, olive oil', 'Drive there SOBER in the morning, drink all day', 'Communal farm dinner — book by email: info@poderilcasale.it', 'Slow Food certified'],
  },
  's-ler1': {
    imageUrl: 'https://images.unsplash.com/photo-1537799943037-f5da89a65689?w=600&h=300&fit=crop',
    highlights: ['On the Lerici bay waterfront', 'Medieval fishing village', 'Walk to seafood restaurants and castle'],
  },
  's-bg1': {
    imageUrl: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600&h=300&fit=crop',
    highlights: ['Inside UNESCO Venetian walls', 'Directly on Piazza Vecchia — the most beautiful piazza in Bergamo'],
  },
  's-bel1': {
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
    highlights: ['Right on Bellagio harbor', 'Family-run since 1850', 'Walk to the ferry'],
  },
  's-sir1': {
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
    highlights: ['4-star with thermal pool', '5-min walk to walled medieval town', 'Lake Garda views'],
  },
  's-ver1': {
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
    highlights: ['ON Piazza delle Erbe — the main square', 'Balconies overlooking evening aperitivo crowd', 'Booking.com 9.0'],
  },
  's-ven1': {
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    highlights: ['Castello district near Rialto', 'Courtyard wellness area', 'Walk to all the best bacari'],
  },

  // ═══ ACTIVITIES ═══
  'a-colo': {
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=300&fit=crop',
    reserveNote: 'Opens exactly 30 days before at 8:45am Rome time — sells out in MINUTES. Set an alarm.',
    whatToExpect: ['The largest amphitheater ever built (50,000 capacity)', 'Underground tunnels where gladiators and animals waited', 'Arena floor with trap doors', 'Roman Forum — the political heart of the Roman Empire', 'Palatine Hill — where emperors lived, best Forum views'],
  },
  'a-vat': {
    imageUrl: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=600&h=300&fit=crop',
    reserveNote: 'Sells out 3–4 weeks ahead in summer. Friday/Saturday evenings less crowded.',
    whatToExpect: ['Sistine Chapel ceiling — Michelangelo painted 1508–1512', '70,000+ works of art', "Gallery of Maps, Raphael Rooms, Laocoön sculpture", "St Peter's dome climb (optional) — best views of Rome"],
  },
  'a-uffizi': {
    imageUrl: 'https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?w=600&h=300&fit=crop',
    reserveNote: 'Skip-the-line essential in July. Book 2+ weeks ahead.',
    whatToExpect: ["Botticelli's Birth of Venus and Primavera", "Caravaggio's Medusa", 'Leonardo da Vinci, Raphael, Titian', 'Renaissance art at its absolute peak'],
  },
  'a-david': {
    imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=300&fit=crop',
    whatToExpect: ["Michelangelo's David — 5.17m of Carrara marble", 'Unfinished Prisoners/Slaves sculptures', '90 minutes is enough — the David is the main event'],
  },
  'a-siena': {
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop',
    whatToExpect: ['Piazza del Campo — fan-shaped, arguably the most beautiful medieval piazza in Europe', 'Gothic cathedral with black-and-white striped marble', 'Where the Palio horse race happens twice yearly', 'UNESCO World Heritage'],
  },
  'a-sg': {
    imageUrl: 'https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=600&h=300&fit=crop',
    whatToExpect: ['14 surviving medieval towers (once had 72)', 'Dondoli — multiple world gelato champion', 'Try the saffron + pine nut flavor created specifically for this town', 'UNESCO World Heritage, on the ancient Via Francigena pilgrim route'],
  },
  'a-contucci': {
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop',
    whatToExpect: ['Walk in off Piazza Grande — no appointment needed', 'Descend into 16th-century tufa cellars', 'Family making Vino Nobile since 1685', 'Tasting ~4 wines for €15'],
  },
  'a-ferry': {
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
    whatToExpect: ['Bellagio → Varenna → Menaggio → back', 'The quintessential Lake Como experience', 'Varenna is the most photogenic village on the lake', 'Mountains dropping directly into glacial water'],
  },
  'a-doges': {
    imageUrl: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=600&h=300&fit=crop',
    reserveNote: 'Skip-the-line essential. Book 2+ weeks ahead.',
    whatToExpect: ["Hall of the Great Council — one of the most impressive rooms in the world", "Secret Itineraries tour includes Casanova's prison cells", "Bridge of Sighs", "St Mark's Basilica golden mosaics"],
  },
  'a-burano': {
    imageUrl: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=600&h=300&fit=crop',
    whatToExpect: ['Burano — each house a different bright color', 'Torcello — ghost island, population ~14', '7th-century mosaic basilica almost empty', 'Vaporetto 12 from Fondamenta Nove'],
  },
  'a-bacaro': {
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    quote: "This is the anti-restaurant. You stand, you eat small things, you drink small glasses of wine, you move on. It's the best food system I've encountered.",
    quoteSource: 'Anthony Bourdain, Parts Unknown Venice (2016)',
    whatToExpect: ['4–5 bacari (small wine bars) in one evening', 'Cicchetti: crostini, meatballs, baccalà, sardines', 'Ombre: tiny glasses of wine ~€1.50 each', 'Eat standing, move on — the most Venetian experience'],
  },
  'a-catullo': {
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
    whatToExpect: ['Largest Roman residential complex in northern Italy', 'At the very tip of the Sirmione peninsula', 'Lake Garda views from ancient ruins', 'Almost nobody makes the 20-min walk out here'],
  },
  'a-arena': {
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
    whatToExpect: ['2,000-year-old Roman amphitheater', '3rd largest in the Roman world', 'Still hosts summer opera and concerts', 'Walk the exterior + Piazza delle Erbe'],
  },
  'a-ccastle': {
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
    whatToExpect: ['Scaliger castle built 1354–1376', 'Battlemented bridge destroyed in WWII, rebuilt stone by stone', 'Museum inside with medieval art', 'Bridge over the Adige river'],
  },
  'a-bergwalls': {
    imageUrl: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600&h=300&fit=crop',
    whatToExpect: ['Take the funicular up to the upper city', 'Walk the intact Venetian walls (UNESCO)', 'Best Po Valley views in all of northern Italy', 'Walls built 1561–1588 by Venice'],
  },

  // ═══ SPECIAL MEALS ═══
  'm-pergola': {
    address: 'Via Alberto Cadlolo 101, Monte Mario (Rome Cavalieri hotel)',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 2+ months ahead — fills up very fast.',
    whatToExpect: ["Rome's only 3-Michelin star", 'Heinz Beck tasting menu', 'Rooftop terrace with ALL of Rome lit below you at night', 'The food is extraordinary but the setting is singular'],
    proTips: ['Dress code: elegant (jacket not required but recommended)', 'Book the terrace table if possible', 'Pair with their wine flight'],
  },
  'm-sesto': {
    address: 'Piazza Ognissanti 3, 6th floor Westin Excelsior',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=300&fit=crop',
    whatToExpect: ['Open terrace directly above the Arno', 'Ponte Vecchio visible below at sunset', 'Modern Tuscan cuisine', 'One of the most beautiful dining settings in Italy'],
  },
  'm-rucola': {
    address: 'Via Strentelle 5, Sirmione',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 3+ weeks ahead — only 12 tables.',
    whatToExpect: ['Lake Garda fish tasting menu', 'Lake perch, whitefish, eel, trout, pike', '1 Michelin star since 2008', 'On the walled Sirmione peninsula'],
  },
  'm-testiere': {
    address: 'Calle del Mondo Novo 5801, Castello, Venice',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 2+ MONTHS ahead — 22 seats, no printed menu. DO THIS TODAY.',
    whatToExpect: ['They tell you what was caught that morning', 'Best seafood in Venice — serious food travelers come here', 'Only 22 seats', 'No printed menu'],
    proTips: ['Email or call to reserve — online booking may not show availability', 'Go for lunch if dinner is full'],
  },

  // ═══ DINING ═══
  'd-roscioli': {
    address: "Via dei Giubbonari 21/22, Campo de' Fiori",
    imageUrl: 'https://images.unsplash.com/photo-1588167056547-c883cdb48543?w=600&h=300&fit=crop',
    quote: 'This is my benchmark for carbonara.',
    quoteSource: 'Anthony Bourdain, No Reservations Rome (2010)',
    reserveNote: 'Reserve 2+ weeks ahead.',
    whatToExpect: ['4-generation family deli-restaurant', 'Counter lined with Italy\'s finest cured meats and cheeses', 'The carbonara that other carbonaras are measured against', 'Also: baccalà mantecato, extraordinary charcuterie'],
    proTips: ['Sit at the counter for the full experience', 'Ask for their wine recommendation — deep cellar'],
  },
  'd-sparita': {
    address: 'Piazza Santa Cecilia 24, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=300&fit=crop',
    quote: "My Restaurant X — the place I didn't want anyone else to know about.",
    quoteSource: 'Anthony Bourdain, No Reservations Rome (2010)',
    reserveNote: 'Reserve 2+ weeks ahead.',
    whatToExpect: ['Cacio e pepe served IN a fried parmesan basket', 'Trastevere location on a quiet piazza', 'Best cacio e pepe in Rome'],
    proTips: ['Ask for the outdoor terrace on the piazza', 'The parmesan basket is the star — order it'],
  },
  'd-pizzarium': {
    address: 'Via della Meloria 43, Prati (near Vatican)',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=300&fit=crop',
    quote: "Best pizza I've ever had.",
    quoteSource: 'Anthony Bourdain, The Layover Rome (2011)',
    whatToExpect: ['Gabriele Bonci — the pizza genius of Rome', 'Ancient grain flours, 72-hour fermentation', 'Seasonal toppings that change daily', 'Pay by weight, eat on the sidewalk, no seating'],
    proTips: ['Opens at noon — go early before best toppings sell out', 'Try whatever looks most unusual — Bonci experiments constantly'],
  },
  'd-mario': {
    address: 'Via Rosina 2, off Piazza del Mercato Centrale',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=300&fit=crop',
    reserveNote: 'Lunch only, noon–3:30pm. Cash only. No reservations. Communal tables.',
    whatToExpect: ['Bistecca alla fiorentina — 800g+ T-bone of Chianina beef', 'Served RARE ONLY — they will refuse to cook it more', 'Since 1953, communal tables', 'Order within 5 minutes of sitting or lose your seat'],
    proTips: ['Get there before noon to avoid the queue', 'Share a bistecca between two — they\'re enormous', 'Cash only — no cards accepted'],
  },
  'd-sostanza': {
    address: 'Via del Porcellana 25r, Centro',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
    reserveNote: 'Reserve weeks ahead — only 10 tables.',
    whatToExpect: ['Since 1869 — oldest restaurant in Florence', 'Hemingway and Keith Richards ate here', 'The kitchen is right in the dining room', 'Pollo al burro sounds simple, tastes extraordinary'],
    proTips: ['Order the artichoke omelette (tortino di carciofi) as a starter', 'Tiny — 10 tables, intimate experience'],
  },
  'd-acqua': {
    address: 'Via del Teatro 22, Montepulciano',
    imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=300&fit=crop',
    reserveNote: 'Reserve ahead — most popular restaurant in town.',
    whatToExpect: ['Hand-rolled pici pasta — thick, like fat spaghetti', 'Pici cacio e pepe and wild boar ragù', 'Communal wooden tables', 'Paired with Vino Nobile di Montepulciano'],
  },
  'd-allarco': {
    address: "Calle dell'Arco 436, San Polo (near Rialto)",
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    quote: "Some of the best small bites I've had in Italy.",
    quoteSource: 'Anthony Bourdain, Parts Unknown Venice (2016)',
    whatToExpect: ['Tiny, standing only', 'Cicchetti crostini made fresh constantly', 'Baccalà mantecato, sarde in saor, seasonal fish'],
    proTips: ['Go at 11am or 6pm — two service windows', 'Point at what looks good — no English menu needed'],
  },
  'd-domori': {
    address: 'Calle dei Do Mori 429, San Polo',
    imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&h=300&fit=crop',
    quote: 'Casanova came here. I can see why.',
    quoteSource: 'Anthony Bourdain, Parts Unknown Venice (2016)',
    whatToExpect: ['Oldest bacaro in Venice — since 1462', 'Copper pots hanging, wine from barrels', 'Baccalà mantecato, mozzarella in carrozza', 'The atmosphere is unrepeatable'],
  },
  'd-carampane': {
    address: 'Rio Terà delle Carampane 1911, San Polo',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=300&fit=crop',
    reserveNote: 'Reserve ahead. No sign outside — hard to find on purpose.',
    whatToExpect: ["Bourdain's Venice seafood pick", 'Fritto misto, sarde in saor, bigoli in salsa', 'Deliberately hidden — no sign on the street', 'Serious Venetian seafood'],
  },
  'd-annamaria': {
    address: 'Via delle Belle Arti 17/A, Bologna',
    imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 1 week ahead.',
    whatToExpect: ['Since 1929 — THE tortellini experience', 'Tortellini in brodo: tiny ring pasta in clear capon broth', 'Nothing like what you get outside Italy', 'Handwritten menu, paper tablecloths'],
    proTips: ['Also order tagliatelle al ragù — the real bolognese', 'Bologna is Italy\'s actual food capital, not Rome'],
  },
  'd-bottega': {
    address: 'Via Scudo di Francia 3, Verona',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop',
    whatToExpect: ['14th-century wine bar', '18,000-bottle cellar — deepest Amarone collection in the world', 'Wine Spectator Grand Award', 'Risotto all\'Amarone is the signature'],
    proTips: ['Order an Amarone by the glass first to taste before committing to a bottle', 'Ask about their older vintages — some go back decades'],
  },
  'd-duca': {
    address: 'Via Arche Scaligere 2, Verona',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop',
    whatToExpect: ["In the 13th-century Montague family house — Romeo's alleged home", "Bigoli al ragù d'anatra (duck ragù)", 'Pastissada de caval — Verona horse stew specialty', 'Most historically atmospheric room in Verona'],
  },
  'd-punta': {
    address: 'Localita Punta Spartivento, Bellagio',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
    whatToExpect: ['At the exact tip of the Bellagio peninsula', 'See both arms of Lake Como simultaneously', 'Risotto al pesce persico (lake perch)', 'Best terrace on all of Lake Como'],
  },
  'd-mimmo': {
    address: 'Via Colleoni 18, Bergamo Alta',
    imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&h=300&fit=crop',
    whatToExpect: ['Polenta con osei — polenta is to Lombardy what pasta is to Rome', 'Casoncelli bergamaschi — stuffed pasta with butter, sage, pancetta', 'TripAdvisor #1 Bergamo Alta for years'],
  },
  'd-freni': {
    address: 'Via del Politeama 4, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=300&fit=crop',
    whatToExpect: ['Best aperitivo in Trastevere', 'Free food buffet 7–10pm with your €10 drink', 'Bruschette, pasta, vegetables — genuinely generous spread', 'Always packed with locals and students'],
  },
  'd-calisto': {
    address: 'Piazza San Calisto 3, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=300&fit=crop',
    whatToExpect: ['The real Trastevere neighborhood bar', 'Old men playing cards, no tourists, no pretension', '€1.20 espresso, cheap cold beer', 'The opposite of a tourist bar'],
  },
  'd-podere': {
    imageUrl: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=600&h=300&fit=crop',
    whatToExpect: ['Communal dinner at the farm table', 'Everything is theirs: wine, cheese, bread, oil', 'Farm pecorino, ribollita, house Orcia DOC wine', 'Email to book: info@poderilcasale.it'],
  },
  'd-frantoio': {
    imageUrl: 'https://images.unsplash.com/photo-1537799943037-f5da89a65689?w=600&h=300&fit=crop',
    whatToExpect: ['Lerici waterfront terrace', 'Fresh catch daily', 'Ligurian seafood, local crowd'],
  },
  'd-pescatore': {
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
    whatToExpect: ['Real local trattoria, zero tourists', 'Fresh lake fish from Garda', 'Grilled perch, eel, trout', 'TripAdvisor #1 Sirmione'],
  },
  'd-vedova': {
    address: 'Calle del Pistor 3912, Cannaregio',
    imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=300&fit=crop',
    whatToExpect: ['THE meatballs of Venice — polpette fritte', 'Traditional trattoria in Cannaregio', 'Most local district in Venice'],
  },
  'd-schiavi': {
    address: 'Fondamenta Nani 992, Dorsoduro',
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    whatToExpect: ['Locals sit on the bridge steps eating cicchetti', 'Most photogenic bacaro in Venice', 'Exceptional crostini'],
  },
  'd-tamburini': {
    address: 'Via Caprarie 1, Bologna',
    imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=600&h=300&fit=crop',
    whatToExpect: ['Historic deli since 1932', 'Mortadella on gnocco fritto at the standing bar', 'The mortadella will ruin all other mortadella forever', 'This is the original — made in Bologna'],
  },

  // ═══ PREVIOUSLY MISSING — ACTIVITIES ═══
  'a-pan': {
    imageUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=300&fit=crop',
    whatToExpect: ['Pantheon — best-preserved Roman building in the world (2,000 years old)', 'Concrete dome still the largest unreinforced concrete dome ever built', 'Trevi Fountain — throw a coin, iconic', 'Piazza Navona — Bernini\'s Fountain of the Four Rivers', 'Do this walk after 8pm when day-trippers leave — Rome transforms'],
  },
  'a-borg': {
    imageUrl: 'https://images.unsplash.com/photo-1596796694498-62ebaeec77fc?w=600&h=300&fit=crop',
    reserveNote: 'Timed entry only, 2-hour slots, max 360 people per slot. Book 1+ month ahead in summer.',
    whatToExpect: ["Bernini's Apollo & Daphne — the moment of transformation, carved from marble", "Bernini's Persephone — you can see his fingers pressing into her thigh in stone", 'Caravaggio paintings in a small palace', 'Intimate experience — feels like a private collection', 'Each visit limited to 2 hours, photos allowed (no flash)'],
  },
  'a-redi': {
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop',
    whatToExpect: ['Under Palazzo Ricci in Montepulciano', 'Medieval cellars carved into volcanic tufa rock', 'More dramatic atmosphere than Contucci', 'Vino Nobile tastings'],
  },
  'a-balbianello': {
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
    reserveNote: 'Must pre-book online. Take the taxi boat from Lenno (~€10 round trip, 5 min).',
    whatToExpect: ['Casino Royale (2006) — Bond recovers with Vesper under the loggia', 'Star Wars Episode II — Padme and Anakin\'s lakeside scenes', '18th-century loggia with panoramic lake views at the summit', 'Terraced gardens above the water', 'Collection of Chinese, African and pre-Colombian art inside', 'One of the most photographed spots on Lake Como'],
  },
  'a-scaliger': {
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
    whatToExpect: ['Medieval moated castle built 1259–1387 by the Scaliger dynasty', 'Enter Sirmione old town via the castle drawbridge', 'Climb the towers for panoramic Lake Garda views', 'The castle sits right on the water — dramatic silhouette'],
  },

  // ═══ PREVIOUSLY MISSING — STAYS ═══
  's-rome3': {
    imageUrl: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=600&h=300&fit=crop',
    highlights: ['Stay in Trastevere — the food neighborhood', 'Kitchen for breakfasts', 'Walk to everything', 'Medieval streets, ivy-covered buildings'],
  },
  's-flo2': {
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=300&fit=crop',
    highlights: ['Medieval tower hotel', "Florence's most elegant shopping street", '360° Duomo views from rooftop terrace', "Condé Nast Traveler readers' choice 2024"],
  },
  's-flo3': {
    imageUrl: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=600&h=300&fit=crop',
    highlights: ['Oltrarno — artisan neighborhood south of the Arno', 'Kitchen, local feel', 'Walk to Santo Spirito — best piazza for aperitivo'],
  },
  's-mon2': {
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop',
    highlights: ['Central Montepulciano location', 'Easy walk to all wine cellars'],
  },
  's-vd2': {
    imageUrl: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=600&h=300&fit=crop',
    highlights: ["Famous La Foce estate — Val d'Orcia's most photographed villa", 'Beautiful gardens and valley views', "Condé Nast Traveler featured"],
  },
  's-ler2': {
    imageUrl: 'https://images.unsplash.com/photo-1537799943037-f5da89a65689?w=600&h=300&fit=crop',
    highlights: ['La Spezia city centre', 'Practical, easy parking', 'Good base for Lerici and coast'],
  },
  's-bg2': {
    imageUrl: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600&h=300&fit=crop',
    highlights: ['Design boutique in a restored medieval tower', 'Dramatic interiors', 'Design Hotels member', "Condé Nast Italy featured"],
  },
  's-bel2': {
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
    highlights: ["Lake Como's legendary 5-star since 1873", 'Private gardens and pool', 'Forbes 5-Star', 'Leading Hotels of the World'],
  },
  's-sir2': {
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
    highlights: ["Inside Sirmione's medieval walls", 'Thermal spa and Lake Garda views', 'Terme di Sirmione group'],
  },
  's-ver2': {
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
    highlights: ['Frescoed ceilings, since 1882', 'Historic luxury in Verona', 'Leading Hotels of the World', "Condé Nast Traveler featured"],
  },
  's-ven2': {
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    highlights: ['Family-run since 1964', "Secret garden 3 minutes from St Mark's", 'San Marco district', "Condé Nast Traveler 2024"],
  },
  's-ven3': {
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    highlights: ['Cannaregio — most local district in Venice', 'Kitchen for cooking', 'Walk to all the best bacari', 'Where Venetians actually live'],
  },

  // ═══ PREVIOUSLY MISSING — DINING ═══
  'd-armando': {
    address: "Salita de' Crescenzi 31, near Pantheon",
    imageUrl: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 2+ weeks ahead — tiny and always full.',
    whatToExpect: ['Family-run since 1961, 40m from the Pantheon', "Gricia — cacio e pepe's ancestor (pecorino + guanciale, no egg)", 'Saltimbocca alla Romana', 'Carciofi alla Romana (Roman-style artichokes)', 'Too small for tourist crowds — locals fill it'],
    proTips: ['Order the gricia — it\'s rarer than carbonara or cacio e pepe', 'Lunch is easier to book than dinner'],
  },
  'd-enzo': {
    address: 'Via dei Vascellari 29, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=600&h=300&fit=crop',
    reserveNote: 'No reservations — queue before 7pm or after 9pm.',
    whatToExpect: ['Classic Trastevere trattoria', 'Their carciofo alla giudea (Jewish-fried artichoke) is one of the best single dishes in Rome', 'Carbonara, amatriciana, coda alla vaccinara'],
    proTips: ['The fried artichoke is mandatory — crispy leaves, tender heart', 'Go before 7pm to minimize the wait', 'Cash helpful but cards accepted'],
  },
  'd-trapizzino': {
    address: 'Via Giovanni Branca 88, Testaccio (original) + Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=300&fit=crop',
    whatToExpect: ['Triangular pizza-dough pocket stuffed with Roman stews', "Invented 2008 by Stefano Callegari — Rome's best modern street food", 'Try coda alla vaccinara (oxtail stew) filling', 'Also pollo alla cacciatora (hunter\'s chicken)'],
    proTips: ['~€4–5 each — get 2 or 3 with different fillings', 'The oxtail is the signature'],
  },
  'd-gracchi': {
    address: 'Via dei Gracchi 272, Prati + Via della Lungaretta 2, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&h=300&fit=crop',
    whatToExpect: ["Locals' consistent #1 gelato in Rome", 'Real Sicilian pistachios — almost savory', 'Nocciola (hazelnut) equally excellent', 'No artificial coloring — natural colors only'],
    proTips: ['The pistacchio is the star — if you get one flavor, get this', 'Prati location near Vatican, Trastevere location near nightlife'],
  },
  'd-antico': {
    address: 'Via dei Neri 65r, Santa Croce, Florence',
    imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=300&fit=crop',
    whatToExpect: ['Best schiacciata in Florence — flat focaccia bread', 'Fillings: finocchiona, truffle cream, prosciutto', 'Queue looks insane but moves in 5 minutes', '~€9 per sandwich'],
    proTips: ['La Favolosa (the famous one) has truffle cream + schiacciata', 'Go at off-peak times (2–4pm) for shorter lines'],
  },
  'd-rastel': {
    address: "Via Sant'Agostino 6, Oltrarno, Florence",
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=300&fit=crop',
    whatToExpect: ['Best aperitivo in Oltrarno', 'Natural wines, small bites', 'Where young Florentines actually go', 'Santo Spirito piazza at sunset is the setting'],
  },
  'd-neri': {
    address: 'Via dei Neri 9/11r, Santa Croce, Florence',
    imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&h=300&fit=crop',
    whatToExpect: ["Locals' #1 gelato pick in Florence", 'Fondente (dark chocolate) is intense and rich', 'Riso (rice) flavor is unique to here', 'Small batches, real ingredients'],
  },
  'd-poliziano': {
    address: 'Via di Voltaia nel Corso 27, Montepulciano',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop',
    whatToExpect: ["Historic café since 1868", 'Henry James and Pirandello drank here', "Best terrace in town with Val d'Orcia views", 'Long wine lunches with Vino Nobile'],
  },
  'd-grotta': {
    address: 'Localita San Biagio, Montepulciano',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=300&fit=crop',
    whatToExpect: ['10-min walk outside the walls', 'Beside the beautiful Renaissance San Biagio church', 'Bistecca alla fiorentina, tagliata', 'Garden terrace dining'],
  },
  'd-marzocco': {
    address: 'Corso di Montepulciano (main street)',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=300&fit=crop',
    whatToExpect: ['The local bar on the main street', 'Morning espresso ritual', 'Evening aperitivo with locals', 'Simple, authentic, no tourists'],
  },
  'd-farinata': {
    imageUrl: 'https://images.unsplash.com/photo-1537799943037-f5da89a65689?w=600&h=300&fit=crop',
    whatToExpect: ['Chickpea flatbread — the oldest street food of the Ligurian Riviera', 'Baked in wood-fired copper pans', '~€2–3 at any bakery in La Spezia', 'Thin, crispy, slightly savory — nothing like it elsewhere'],
  },
  'd-tasso': {
    address: 'Piazza Vecchia 3, Bergamo Alta',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=300&fit=crop',
    whatToExpect: ['Has been serving coffee since 1476', 'On the most beautiful piazza in Bergamo Alta', 'The building itself is the experience', 'Perfect for an espresso or evening spritz'],
  },
  'd-bilacus': {
    address: 'Salita Serbelloni 32, Bellagio',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
    whatToExpect: ['Up a stone alley from the harbor', 'Locals-heavy, not on the tourist drag', 'Lake-fish ravioli, pizzoccheri (buckwheat pasta)', 'Best value in Bellagio'],
  },
  'd-rossi': {
    address: 'Bellagio waterfront promenade',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
    whatToExpect: ['THE aperitivo spot in Bellagio', 'Lake views while watching ferries arrive', 'Spritz + lake breeze at sunset'],
  },
  'd-grifone': {
    address: 'Near Scaliger Castle, Sirmione',
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
    whatToExpect: ['Right next to the castle walls', 'Best sunset aperitivo spot in Sirmione', 'Castle and lake views from your table'],
  },
  'd-mazzanti': {
    address: 'Piazza delle Erbe, Verona',
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
    whatToExpect: ['On the most beautiful square in Verona', 'THE aperitivo stop at sunset', 'Spritz and people-watching', 'Medieval frescoed building facade'],
  },
  'd-sottoriva': {
    address: 'Via Sottoriva, Verona (under medieval porticos)',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop',
    whatToExpect: ['Under medieval porticos along the Adige river', 'Bigoli in salsa (anchovy-onion pasta)', '€3 ombre wine — cheapest good wine in Verona', 'Perfect local lunch stop'],
  },
  'd-lele': {
    address: 'Campo dei Tolentini 183, Santa Croce, Venice',
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    whatToExpect: ['Student favorite — cheapest in Venice', 'Mini panini €1.75, wine €1.20', 'Sit on the church steps', 'No frills, maximum Venice'],
  },

  // ═══ PREVIOUSLY MISSING — SPECIAL MEALS ═══
  'm-pagliaccio': {
    address: "Via dei Banchi Vecchi 129, near Campo de' Fiori",
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 1+ month ahead.',
    whatToExpect: ['2 Michelin stars', 'Creative Italian tasting menu by Anthony Genovese', 'More cutting-edge and contemporary than La Pergola', 'Slightly more accessible booking-wise'],
    proTips: ['Pick either this OR La Pergola — both in one trip is overkill', 'This is the more modern, experimental choice'],
  },
  'm-fiore': {
    address: 'Calle del Scaleter 2202, San Polo, Venice',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=300&fit=crop',
    reserveNote: 'Reserve weeks ahead.',
    whatToExpect: ["Venice's most consistent Michelin star", 'Seafood only, near San Polo', 'Intimate atmosphere', 'The serious alternative to Testiere'],
  },
};
