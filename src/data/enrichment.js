// Extra detail data keyed by item id — merged into ITEMS at import time
// Fields: address, imageUrl, quote, quoteSource, reserveNote
export const ENRICHMENT = {
  // DINING — ROME
  'd-roscioli': {
    address: 'Via dei Giubbonari 21/22, Campo de\' Fiori',
    imageUrl: 'https://images.unsplash.com/photo-1588167056547-c883cdb48543?w=600&h=300&fit=crop',
    quote: 'This is my benchmark for carbonara.',
    quoteSource: 'Anthony Bourdain, No Reservations Rome (2010)',
    reserveNote: 'Reserve 2+ weeks ahead — fills up fast in summer.',
  },
  'd-sparita': {
    address: 'Piazza Santa Cecilia 24, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=300&fit=crop',
    quote: 'My Restaurant X — the place I didn\'t want anyone else to know about.',
    quoteSource: 'Anthony Bourdain, No Reservations Rome (2010)',
    reserveNote: 'Reserve 2+ weeks ahead.',
  },
  'd-pizzarium': {
    address: 'Via della Meloria 43, Prati (near Vatican)',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=300&fit=crop',
    quote: 'Best pizza I\'ve ever had.',
    quoteSource: 'Anthony Bourdain, The Layover Rome (2011)',
  },
  'd-armando': {
    address: 'Salita de\' Crescenzi 31 (40m from the Pantheon)',
    imageUrl: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 2+ weeks ahead — tiny and always full.',
  },
  'd-enzo': {
    address: 'Via dei Vascellari 29, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=600&h=300&fit=crop',
    reserveNote: 'No reservations — queue before 7pm or after 9pm.',
  },
  'd-freni': {
    address: 'Via del Politeama 4, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=300&fit=crop',
  },
  'd-calisto': {
    address: 'Piazza San Calisto 3, Trastevere',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=300&fit=crop',
  },
  'd-gracchi': {
    address: 'Via dei Gracchi 272, Prati',
    imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&h=300&fit=crop',
  },
  // DINING — FLORENCE
  'd-mario': {
    address: 'Via Rosina 2, off Piazza del Mercato Centrale',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=300&fit=crop',
    reserveNote: 'Lunch only, noon–3:30pm. Cash only. No reservations. Communal tables.',
  },
  'd-sostanza': {
    address: 'Via del Porcellana 25r, Centro',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
    reserveNote: 'Reserve weeks ahead — only 10 tables.',
  },
  'd-antico': {
    address: 'Via dei Neri 65r, Santa Croce',
    imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=300&fit=crop',
  },
  'd-rastel': {
    address: 'Via Sant\'Agostino 6, Oltrarno',
    imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=300&fit=crop',
  },
  // DINING — MONTEPULCIANO
  'd-acqua': {
    address: 'Via del Teatro 22, Montepulciano',
    imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=300&fit=crop',
    reserveNote: 'Reserve ahead — the most popular restaurant in town.',
  },
  'd-poliziano': {
    address: 'Via di Voltaia nel Corso 27, Montepulciano',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop',
  },
  // DINING — VENICE
  'd-allarco': {
    address: 'Calle dell\'Arco 436, San Polo (near Rialto)',
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    quote: 'Some of the best small bites I\'ve had in Italy.',
    quoteSource: 'Anthony Bourdain, Parts Unknown Venice (2016)',
  },
  'd-domori': {
    address: 'Calle dei Do Mori 429, San Polo',
    imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&h=300&fit=crop',
    quote: 'Casanova came here. I can see why.',
    quoteSource: 'Anthony Bourdain, Parts Unknown Venice (2016)',
  },
  'd-carampane': {
    address: 'Rio Terà delle Carampane 1911, San Polo',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=300&fit=crop',
    reserveNote: 'Reserve ahead. No sign outside — hard to find on purpose.',
  },
  'd-vedova': {
    address: 'Calle del Pistor 3912, Cannaregio',
    imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=300&fit=crop',
  },
  'd-annamaria': {
    address: 'Via delle Belle Arti 17/A, Bologna',
    imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 1 week ahead.',
  },
  'd-bottega': {
    address: 'Via Scudo di Francia 3, Verona',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop',
  },
  'd-duca': {
    address: 'Via Arche Scaligere 2, Verona',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop',
  },
  'd-punta': {
    address: 'Localita Punta Spartivento, Bellagio',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
  },
  'd-mimmo': {
    address: 'Via Colleoni 18, Bergamo Alta',
    imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&h=300&fit=crop',
  },
  'd-tasso': {
    address: 'Piazza Vecchia 3, Bergamo Alta',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=300&fit=crop',
  },
  // SPECIAL MEALS
  'm-pergola': {
    address: 'Via Alberto Cadlolo 101, Monte Mario (Rome Cavalieri hotel)',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 2+ months ahead — fills up very fast.',
  },
  'm-sesto': {
    address: 'Piazza Ognissanti 3, 6th floor Westin Excelsior, Florence',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=300&fit=crop',
  },
  'm-rucola': {
    address: 'Via Strentelle 5, Sirmione',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 3+ weeks ahead — only 12 tables.',
  },
  'm-testiere': {
    address: 'Calle del Mondo Novo 5801, Castello, Venice',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=300&fit=crop',
    reserveNote: 'Reserve 2+ MONTHS ahead — 22 seats, no printed menu.',
  },
  // ACTIVITIES
  'a-colo': {
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=300&fit=crop',
    reserveNote: 'Opens exactly 30 days before at 8:45am Rome time — sells out in MINUTES.',
  },
  'a-vat': {
    imageUrl: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=600&h=300&fit=crop',
    reserveNote: 'Sells out 3–4 weeks ahead in summer.',
  },
  'a-uffizi': {
    imageUrl: 'https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?w=600&h=300&fit=crop',
    reserveNote: 'Skip-the-line essential in July. Book 2+ weeks ahead.',
  },
  'a-david': {
    imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=300&fit=crop',
  },
  'a-doges': {
    imageUrl: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=600&h=300&fit=crop',
    reserveNote: 'Skip-the-line essential. Book 2+ weeks ahead.',
  },
  'a-ferry': {
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
  },
  'a-burano': {
    imageUrl: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=600&h=300&fit=crop',
  },
  'a-bacaro': {
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
    quote: 'This is the anti-restaurant. You stand, you eat small things, you drink small glasses of wine, you move on. It\'s the best food system I\'ve encountered.',
    quoteSource: 'Anthony Bourdain, Parts Unknown Venice (2016)',
  },
  'a-contucci': {
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=300&fit=crop',
  },
  'a-catullo': {
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
  },
  'a-siena': {
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop',
  },
  'a-arena': {
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
  },
  // STAYS
  's-rome1': {
    imageUrl: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=600&h=300&fit=crop',
  },
  's-flo1': {
    imageUrl: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=600&h=300&fit=crop',
  },
  's-mon1': {
    imageUrl: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=300&fit=crop',
  },
  's-vd1': {
    imageUrl: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=600&h=300&fit=crop',
  },
  's-ler1': {
    imageUrl: 'https://images.unsplash.com/photo-1537799943037-f5da89a65689?w=600&h=300&fit=crop',
  },
  's-bg1': {
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
  },
  's-bel1': {
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&h=300&fit=crop',
  },
  's-sir1': {
    imageUrl: 'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=600&h=300&fit=crop',
  },
  's-ver1': {
    imageUrl: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&h=300&fit=crop',
  },
  's-ven1': {
    imageUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600&h=300&fit=crop',
  },
};
