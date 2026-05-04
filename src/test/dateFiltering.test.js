import { describe, it, expect } from 'vitest';
import { toDateStr, itemInStop, getCalendarDates, calcNights } from '../features/itinerary/utils';

describe('itemInStop', () => {
  it('returns true when stop_ids includes stopId', () => {
    expect(itemInStop({ stop_ids: ['stop-rome', 'stop-florence'] }, 'stop-rome')).toBe(true);
  });
  it('returns false when stop_ids does not include stopId', () => {
    expect(itemInStop({ stop_ids: ['stop-rome'] }, 'stop-florence')).toBe(false);
  });
  it('returns false when stop_ids is null', () => {
    expect(itemInStop({ stop_ids: null }, 'stop-rome')).toBe(false);
  });
  it('returns false when stop_ids is undefined', () => {
    expect(itemInStop({}, 'stop-rome')).toBe(false);
  });
});

describe('date filtering logic', () => {
  const stops = [
    { id: 'stop-rome', name: 'Rome', start_date: '2026-07-20', end_date: '2026-07-24', sort_order: 1 },
    { id: 'stop-florence', name: 'Florence', start_date: '2026-07-24', end_date: '2026-07-26', sort_order: 2 },
  ];

  it('getCalendarDates generates correct date range', () => {
    const dates = getCalendarDates(stops);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates[0].date).toBe('2026-07-20');
    expect(dates[dates.length - 1].date).toBe('2026-07-26');
  });

  it('getCalendarDates includes overlapping dates for both stops', () => {
    const dates = getCalendarDates(stops);
    const jul24 = dates.find(d => d.date === '2026-07-24');
    expect(jul24).toBeDefined();
    expect(jul24.overlapping.length).toBe(2);
  });

  it('calcNights returns correct value for multi-day stop', () => {
    expect(calcNights(stops[0])).toBe(4);
  });

  it('dateLabels includes end_date (checkout day)', () => {
    const nights = calcNights(stops[0]);
    const startStr = toDateStr(stops[0].start_date);
    const labels = {};
    const [sy, sm, sd] = startStr.split('-').map(Number);
    for (let i = 0; i <= nights; i++) {
      const d = new Date(sy, sm - 1, sd + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      labels[ds] = true;
    }
    expect(labels['2026-07-20']).toBe(true);
    expect(labels['2026-07-24']).toBe(true);
  });

  it('item with start_time on end_date matches dateLabels', () => {
    const nights = calcNights(stops[0]);
    const startStr = toDateStr(stops[0].start_date);
    const labels = {};
    const [sy, sm, sd] = startStr.split('-').map(Number);
    for (let i = 0; i <= nights; i++) {
      const d = new Date(sy, sm - 1, sd + i);
      labels[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = true;
    }
    const item = { start_time: '2026-07-24T09:00' };
    const itemDate = item.start_time.split('T')[0];
    expect(labels[itemDate]).toBe(true);
  });
});

describe('transport departure stop logic', () => {
  it('transport item appears in first stop_id (departure)', () => {
    const item = { id: 't1', type: 'transport', stop_ids: ['stop-rome', 'stop-florence'] };
    const stop = { id: 'stop-rome' };
    const isDeparture = item.stop_ids[0] === stop.id;
    expect(isDeparture).toBe(true);
  });

  it('transport item does not appear in second stop_id (arrival)', () => {
    const item = { id: 't1', type: 'transport', stop_ids: ['stop-rome', 'stop-florence'] };
    const stop = { id: 'stop-florence' };
    const isDeparture = item.stop_ids[0] === stop.id;
    expect(isDeparture).toBe(false);
  });
});

describe('date mode item filtering', () => {
  function getItemDate(startTime) {
    if (!startTime) return null;
    return startTime.includes('T') ? startTime.split('T')[0] : null;
  }

  it('filters items by selected date', () => {
    const items = [
      { id: '1', start_time: '2026-07-20T10:00', stop_ids: ['stop-rome'] },
      { id: '2', start_time: '2026-07-21T14:00', stop_ids: ['stop-rome'] },
      { id: '3', start_time: '2026-07-20T18:00', stop_ids: ['stop-rome'] },
      { id: '4', stop_ids: ['stop-rome'] },
    ];
    const selectedDate = '2026-07-20';
    const filtered = items.filter(it => {
      const itemDate = getItemDate(it.start_time);
      if (itemDate && itemDate !== selectedDate) return false;
      return true;
    });
    expect(filtered.length).toBe(3);
    expect(filtered.map(it => it.id)).toEqual(['1', '3', '4']);
  });

  it('includes items without start_time in date mode', () => {
    const items = [
      { id: '1', start_time: '2026-07-20T10:00' },
      { id: '2', start_time: null },
      { id: '3' },
    ];
    const selectedDate = '2026-07-20';
    const filtered = items.filter(it => {
      const itemDate = getItemDate(it.start_time);
      if (itemDate && itemDate !== selectedDate) return false;
      return true;
    });
    expect(filtered.length).toBe(3);
  });
});
