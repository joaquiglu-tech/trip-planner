export const TL_STOPS = [
  { key: 'Rome', label: 'Rome', nights: 4, stayCity: 'Rome', transport: { icon: '✈️', label: 'Fly in', trId: 'tr3' } },
  { key: 'Florence', label: 'Florence', nights: 2, stayCity: 'Florence', transport: { icon: '🚂', label: 'Train', trId: 'tr4' } },
  { key: 'Montepulciano', label: 'Montepu.', nights: 1, stayCity: 'Montepulciano', transport: { icon: '🚗', label: 'Drive', trId: 'tr5' } },
  { key: "Val d'Orcia", label: "Val d'Orcia", nights: 1, stayCity: "Val d'Orcia", transport: { icon: '🚗', label: 'Drive', trId: 'tr5' } },
  { key: 'Lerici', label: 'Lerici', nights: 1, stayCity: 'Lerici', transport: { icon: '🚗', label: 'Drive', trId: 'tr5' } },
  { key: 'Bergamo Alta', label: 'Bergamo', nights: 1, stayCity: 'Bergamo Alta', transport: { icon: '🚗', label: 'Drive', trId: 'tr5' } },
  { key: 'Bellagio', label: 'Bellagio', nights: 1, stayCity: 'Bellagio', transport: { icon: '🚗', label: 'Drive', trId: 'tr5' } },
  { key: 'Sirmione', label: 'Sirmione', nights: 1, stayCity: 'Sirmione', transport: { icon: '🚗', label: 'Drive', trId: 'tr5' } },
  { key: 'Verona', label: 'Verona', nights: 1, stayCity: 'Verona', transport: { icon: '🚗', label: 'Drive', trId: 'tr5' } },
  { key: 'Venice', label: 'Venice', nights: 1, stayCity: 'Venice', transport: { icon: '🚂+🚗', label: 'Train+Car', trId: 'tr5' } },
];

export const ROUTE_STOPS = [
  { lat: 41.9028, lng: 12.4964, label: 'Rome', sub: '4n · fly in', color: '#1d4ed8', big: true },
  { lat: 43.7696, lng: 11.2558, label: 'Florence', sub: 'base', color: '#ea580c', big: true },
  { lat: 43.0958, lng: 11.7844, label: 'Montepulciano', sub: '1n', color: '#ea580c', big: false },
  { lat: 43.0333, lng: 11.6167, label: 'Podere Il Casale', sub: '1n', color: '#ea580c', big: false },
  { lat: 43.3182, lng: 11.3307, label: 'Siena', sub: 'stop', color: '#92400e', big: false },
  { lat: 43.4674, lng: 11.043, label: 'S. Gimignano', sub: 'stop', color: '#92400e', big: false },
  { lat: 44.0718, lng: 9.9121, label: 'Lerici', sub: '1n', color: '#ea580c', big: true },
  { lat: 44.8015, lng: 10.3279, label: 'Parma', sub: 'lunch', color: '#92400e', big: false },
  { lat: 45.7076, lng: 9.6678, label: 'Bergamo Alta', sub: '1n', color: '#ea580c', big: true },
  { lat: 45.9867, lng: 9.2582, label: 'Bellagio', sub: '1n', color: '#ea580c', big: true },
  { lat: 45.4909, lng: 10.6056, label: 'Sirmione', sub: '1n', color: '#ea580c', big: true },
  { lat: 45.4384, lng: 10.9916, label: 'Verona', sub: '1n', color: '#ea580c', big: true },
  { lat: 44.4949, lng: 11.3426, label: 'Bologna', sub: 'lunch', color: '#92400e', big: false },
  { lat: 45.4408, lng: 12.3155, label: 'Venice', sub: '1n · fly out', color: '#1d4ed8', big: true },
];

export const ROUTE_LINES = [
  { path: [{ lat: 41.9028, lng: 12.4964 }, { lat: 43.5, lng: 12.1 }, { lat: 43.7696, lng: 11.2558 }], color: '#1d4ed8', w: 3, dash: true },
  { path: [{ lat: 43.7696, lng: 11.2558 }, { lat: 43.45, lng: 11.4 }, { lat: 43.0958, lng: 11.7844 }], color: '#ea580c', w: 3 },
  { path: [{ lat: 43.0958, lng: 11.7844 }, { lat: 43.0333, lng: 11.6167 }], color: '#ea580c', w: 3 },
  { path: [{ lat: 43.0333, lng: 11.6167 }, { lat: 43.3182, lng: 11.3307 }, { lat: 43.4674, lng: 11.043 }, { lat: 44.0718, lng: 9.9121 }], color: '#ea580c', w: 3 },
  { path: [{ lat: 44.0718, lng: 9.9121 }, { lat: 44.8015, lng: 10.3279 }, { lat: 45.2, lng: 10.0 }, { lat: 45.7076, lng: 9.6678 }], color: '#ea580c', w: 3 },
  { path: [{ lat: 45.7076, lng: 9.6678 }, { lat: 45.9867, lng: 9.2582 }], color: '#ea580c', w: 3 },
  { path: [{ lat: 45.9867, lng: 9.2582 }, { lat: 45.55, lng: 10.2 }, { lat: 45.4909, lng: 10.6056 }, { lat: 45.4384, lng: 10.9916 }], color: '#ea580c', w: 3 },
  { path: [{ lat: 45.4384, lng: 10.9916 }, { lat: 44.4949, lng: 11.3426 }, { lat: 43.7696, lng: 11.2558 }], color: '#ea580c', w: 3 },
  { path: [{ lat: 43.7696, lng: 11.2558 }, { lat: 44.4, lng: 11.7 }, { lat: 45.4408, lng: 12.3155 }], color: '#1d4ed8', w: 3, dash: true },
];
