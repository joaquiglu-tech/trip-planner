import { describe, it, expect } from 'vitest';
import { getStopStats, itemInStop } from '../features/itinerary/utils';

describe('getStopStats', () => {
  const stop = { id: 'stop-rome' };

  it('identifies critical status when stay not booked', () => {
    const items = [
      { id: '1', type: 'stay', status: 'sel', stop_ids: ['stop-rome'] },
    ];
    const stats = getStopStats(stop, items);
    expect(stats.status).toBe('critical');
    expect(stats.hasStays).toBe(true);
    expect(stats.stayBooked).toBe(false);
  });

  it('identifies ready status when stay booked', () => {
    const items = [
      { id: '1', type: 'stay', status: 'conf', stop_ids: ['stop-rome'] },
    ];
    const stats = getStopStats(stop, items);
    expect(stats.status).toBe('ready');
    expect(stats.stayBooked).toBe(true);
  });

  it('identifies warning when no activities selected', () => {
    const items = [
      { id: '1', type: 'stay', status: 'conf', stop_ids: ['stop-rome'] },
      { id: '2', type: 'activity', status: '', stop_ids: ['stop-rome'] },
    ];
    const stats = getStopStats(stop, items);
    expect(stats.status).toBe('warning');
  });

  it('counts food items', () => {
    const items = [
      { id: '1', type: 'food', status: 'sel', stop_ids: ['stop-rome'] },
      { id: '2', type: 'food', status: 'sel', stop_ids: ['stop-rome'] },
      { id: '3', type: 'food', status: '', stop_ids: ['stop-rome'] },
    ];
    const stats = getStopStats(stop, items);
    expect(stats.foodSelected).toBe(2);
    expect(stats.foodTotal).toBe(3);
  });

  it('handles transport booking status', () => {
    const items = [
      { id: '1', type: 'transport', status: 'sel', stop_ids: ['stop-rome'] },
    ];
    const stats = getStopStats(stop, items);
    expect(stats.hasTransport).toBe(true);
    expect(stats.transportBooked).toBe(false);
  });

  it('handles items linked to multiple stops', () => {
    const items = [
      { id: '1', type: 'transport', status: 'conf', stop_ids: ['stop-rome', 'stop-florence'] },
    ];
    const romeStats = getStopStats({ id: 'stop-rome' }, items);
    const florenceStats = getStopStats({ id: 'stop-florence' }, items);
    expect(romeStats.hasTransport).toBe(true);
    expect(florenceStats.hasTransport).toBe(true);
  });

  it('returns empty stats for stop with no items', () => {
    const stats = getStopStats(stop, []);
    expect(stats.status).toBe('ready');
    expect(stats.hasStays).toBe(false);
    expect(stats.actTotal).toBe(0);
  });
});
