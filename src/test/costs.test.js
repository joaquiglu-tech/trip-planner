import { describe, it, expect } from 'vitest';
import { itemCost, $f, priceLabel } from '../shared/hooks/useItems';

describe('itemCost', () => {
  it('returns estimated_cost as number', () => {
    expect(itemCost({ estimated_cost: '150' })).toBe(150);
  });
  it('returns 0 for null estimated_cost', () => {
    expect(itemCost({ estimated_cost: null })).toBe(0);
  });
  it('returns 0 for empty item', () => {
    expect(itemCost({})).toBe(0);
  });
  it('handles string "0"', () => {
    expect(itemCost({ estimated_cost: '0' })).toBe(0);
  });
});

describe('$f', () => {
  it('formats number with dollar sign', () => {
    expect($f(1500)).toBe('$1,500');
  });
  it('handles 0', () => {
    expect($f(0)).toBe('$0');
  });
  it('handles null', () => {
    expect($f(null)).toBe('$0');
  });
});

describe('priceLabel', () => {
  it('shows confirmed when expense exists', () => {
    const result = priceLabel({ estimated_cost: 100, type: 'food' }, 0, 85);
    expect(result.type).toBe('confirmed');
    expect(result.text).toBe('$85');
  });
  it('shows live price for stays', () => {
    const result = priceLabel({ estimated_cost: 100, type: 'stay' }, 200, 0);
    expect(result.type).toBe('live');
    expect(result.text).toContain('200');
  });
  it('shows estimate when no expense or live', () => {
    const result = priceLabel({ estimated_cost: 100, type: 'food' }, 0, 0);
    expect(result.type).toBe('estimate');
    expect(result.text).toBe('$100');
  });
  it('shows Free for activity with 0 cost', () => {
    const result = priceLabel({ estimated_cost: 0, type: 'activity' }, 0, 0);
    expect(result.text).toBe('Free');
  });
  it('returns empty for no data', () => {
    const result = priceLabel({ type: 'food' }, 0, 0);
    expect(result.text).toBe('');
  });
});
