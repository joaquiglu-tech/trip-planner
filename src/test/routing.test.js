import { describe, it, expect, beforeEach } from 'vitest';

// Test the hash routing logic
function getTabFromHash(hash) {
  const cleaned = hash.replace('#/', '').split('/')[0];
  if (['plan', 'expenses', 'itinerary', 'profile'].includes(cleaned)) return cleaned;
  return 'itinerary';
}

describe('Hash routing', () => {
  it('parses itinerary tab', () => {
    expect(getTabFromHash('#/itinerary')).toBe('itinerary');
  });
  it('parses plan tab', () => {
    expect(getTabFromHash('#/plan')).toBe('plan');
  });
  it('parses expenses tab', () => {
    expect(getTabFromHash('#/expenses')).toBe('expenses');
  });
  it('parses profile tab', () => {
    expect(getTabFromHash('#/profile')).toBe('profile');
  });
  it('defaults to itinerary for empty hash', () => {
    expect(getTabFromHash('')).toBe('itinerary');
  });
  it('defaults to itinerary for invalid hash', () => {
    expect(getTabFromHash('#/invalid')).toBe('itinerary');
  });
  it('handles nested paths', () => {
    expect(getTabFromHash('#/itinerary/stop-rome')).toBe('itinerary');
  });
});
