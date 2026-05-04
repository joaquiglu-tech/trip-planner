// Shared utilities for the itinerary feature

export function toDateStr(d) {
  if (!d) return '';
  return String(d).substring(0, 10);
}

export function formatStopDate(stop) {
  const sd = toDateStr(stop.start_date);
  const ed = toDateStr(stop.end_date);
  if (!sd) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [sy, smn, sdy] = sd.split('-').map(Number);
  const [ey, emn, edy] = ed.split('-').map(Number);
  const sm = months[smn - 1], em = months[emn - 1];
  if (smn === emn && sdy !== edy) return `${sm} ${sdy}–${edy}`;
  if (smn !== emn) return `${sm} ${sdy} – ${em} ${edy}`;
  return `${sm} ${sdy}`;
}

export function calcNights(stop) {
  const sd = toDateStr(stop.start_date);
  const ed = toDateStr(stop.end_date);
  if (!sd || !ed) return 1;
  const [sy, sm, sday] = sd.split('-').map(Number);
  const [ey, em, eday] = ed.split('-').map(Number);
  return Math.max(1, Math.round((new Date(ey, em - 1, eday) - new Date(sy, sm - 1, sday)) / 86400000));
}

export function formatTime(t) {
  if (!t) return '';
  // Handle datetime-local format "2026-07-20T14:00"
  const timePart = t.includes('T') ? t.split('T')[1] : t;
  const [h, m] = timePart.split(':');
  const hour = parseInt(h);
  if (isNaN(hour)) return t;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export const TYPE_LABEL_SHORT = { stay: 'Stay', food: 'Food', activity: 'Activity', transport: 'Transport' };

export function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function itemInStop(it, stopId) {
  return it.stop_ids?.includes(stopId) || false;
}

export function getStay(items, stopId) {
  return items.find(it => it.type === 'stay' && itemInStop(it, stopId) && (it.status === 'sel' || it.status === 'conf'));
}

export function getTodayDayIndex(stops) {
  const now = new Date();
  for (let i = 0; i < stops.length; i++) {
    if (now >= new Date(stops[i].start_date) && now < new Date(stops[i].end_date)) return i;
  }
  return null;
}

export function getDaysUntilTrip(stops) {
  if (!stops.length) return 0;
  return Math.ceil((new Date(stops[0].start_date) - new Date()) / 86400000);
}

export function getStopStats(stop, items) {
  const stopItems = items.filter(it => itemInStop(it, stop.id));
  const stays = stopItems.filter(it => it.type === 'stay');
  const transports = stopItems.filter(it => it.type === 'transport');
  const activities = stopItems.filter(it => it.type === 'activity');
  const food = stopItems.filter(it => it.type === 'food');
  const stayBooked = stays.some(it => it.status === 'conf');
  const staySelected = stays.some(it => it.status === 'sel' || it.status === 'conf');
  const transportBooked = transports.length === 0 || transports.every(it => it.status === 'conf');
  const actSelected = activities.filter(it => it.status === 'sel' || it.status === 'conf').length;
  const foodSelected = food.filter(it => it.status === 'sel' || it.status === 'conf').length;
  let status = 'ready';
  if ((stays.length > 0 && !stayBooked) || (transports.length > 0 && !transportBooked)) status = 'critical';
  else if (actSelected === 0 && activities.length > 0) status = 'warning';
  return { stayBooked, staySelected, hasTransport: transports.length > 0, transportBooked, actSelected, actTotal: activities.length, foodSelected, foodTotal: food.length, status, hasStays: stays.length > 0 };
}

export function getCalendarDates(stops) {
  if (!stops.length) return [];
  const startStr = toDateStr(stops[0].start_date);
  const endStr = toDateStr(stops[stops.length - 1].end_date);
  if (!startStr || !endStr) return [];
  const dates = [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const overlapping = stops.filter(s => dateStr >= toDateStr(s.start_date) && dateStr <= toDateStr(s.end_date));
    const stop = overlapping[0] || null;
    const title = overlapping.length > 1 ? overlapping.map(s => s.name).join(' / ') : (stop?.name || '');
    dates.push({ date: dateStr, shortLabel: `${months[d.getMonth()]} ${d.getDate()}`, title, stop, stopIdx: stop ? stops.indexOf(stop) : -1, overlapping });
  }
  return dates.filter(cd => cd.stopIdx >= 0);
}
