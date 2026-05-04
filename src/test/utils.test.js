import { describe, it, expect } from 'vitest';
import {
  toDateStr, formatStopDate, calcNights, formatTime, formatRelativeTime,
  itemInStop, getCalendarDates
} from '../features/itinerary/utils';

describe('toDateStr', () => {
  it('extracts date from ISO string', () => {
    expect(toDateStr('2026-07-20T00:00:00Z')).toBe('2026-07-20');
  });
  it('handles plain date', () => {
    expect(toDateStr('2026-07-20')).toBe('2026-07-20');
  });
  it('handles Supabase timestamp format', () => {
    expect(toDateStr('2026-07-20 00:00:00+00')).toBe('2026-07-20');
  });
  it('returns empty for null', () => {
    expect(toDateStr(null)).toBe('');
  });
});

describe('formatStopDate', () => {
  it('formats same-month range', () => {
    expect(formatStopDate({ start_date: '2026-07-20', end_date: '2026-07-24' })).toBe('Jul 20–24');
  });
  it('formats cross-month range', () => {
    expect(formatStopDate({ start_date: '2026-07-31', end_date: '2026-08-03' })).toBe('Jul 31 – Aug 3');
  });
  it('formats single day', () => {
    expect(formatStopDate({ start_date: '2026-07-20', end_date: '2026-07-20' })).toBe('Jul 20');
  });
});

describe('calcNights', () => {
  it('calculates multi-night stay', () => {
    expect(calcNights({ start_date: '2026-07-20', end_date: '2026-07-24' })).toBe(4);
  });
  it('returns 1 for same-day', () => {
    expect(calcNights({ start_date: '2026-07-20', end_date: '2026-07-20' })).toBe(1);
  });
  it('returns 1 for missing dates', () => {
    expect(calcNights({ start_date: null, end_date: null })).toBe(1);
  });
});

describe('formatTime', () => {
  it('formats 24h to 12h AM', () => {
    expect(formatTime('08:30')).toBe('8:30 AM');
  });
  it('formats PM', () => {
    expect(formatTime('20:00')).toBe('8:00 PM');
  });
  it('formats noon', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });
  it('returns empty for null', () => {
    expect(formatTime(null)).toBe('');
  });
});

describe('itemInStop', () => {
  it('returns true when stop_ids includes stopId', () => {
    expect(itemInStop({ stop_ids: ['stop-rome', 'stop-florence'] }, 'stop-rome')).toBe(true);
  });
  it('returns false when not included', () => {
    expect(itemInStop({ stop_ids: ['stop-rome'] }, 'stop-venice')).toBe(false);
  });
  it('returns false for null stop_ids', () => {
    expect(itemInStop({ stop_ids: null }, 'stop-rome')).toBe(false);
  });
  it('returns false for empty array', () => {
    expect(itemInStop({ stop_ids: [] }, 'stop-rome')).toBe(false);
  });
});

describe('getCalendarDates', () => {
  const stops = [
    { id: 's1', name: 'Rome', start_date: '2026-07-20', end_date: '2026-07-22' },
    { id: 's2', name: 'Florence', start_date: '2026-07-22', end_date: '2026-07-24' },
  ];

  it('generates correct number of dates', () => {
    const dates = getCalendarDates(stops);
    expect(dates.length).toBeGreaterThanOrEqual(4);
  });
  it('first date matches first stop start', () => {
    const dates = getCalendarDates(stops);
    expect(dates[0].date).toBe('2026-07-20');
    expect(dates[0].title).toBe('Rome');
  });
  it('overlapping dates show both stops', () => {
    const dates = getCalendarDates(stops);
    const jul22 = dates.find(d => d.date === '2026-07-22');
    expect(jul22.title).toContain('Rome');
    expect(jul22.title).toContain('Florence');
  });
  it('returns empty for no stops', () => {
    expect(getCalendarDates([])).toEqual([]);
  });
});
