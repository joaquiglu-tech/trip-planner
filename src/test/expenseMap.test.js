import { describe, it, expect } from 'vitest';

describe('expense map pre-computation', () => {
  function buildExpenseMap(expenses) {
    const map = {};
    (expenses || []).forEach(e => { map[e.item_id] = (map[e.item_id] || 0) + Number(e.amount || 0); });
    return map;
  }

  it('groups expenses by item_id', () => {
    const expenses = [
      { item_id: 'a', amount: 100 },
      { item_id: 'b', amount: 50 },
      { item_id: 'a', amount: 25 },
    ];
    const map = buildExpenseMap(expenses);
    expect(map['a']).toBe(125);
    expect(map['b']).toBe(50);
    expect(map['c']).toBeUndefined();
  });

  it('handles empty expenses', () => {
    expect(buildExpenseMap([])).toEqual({});
    expect(buildExpenseMap(null)).toEqual({});
  });

  it('handles string amounts', () => {
    const expenses = [{ item_id: 'a', amount: '100.50' }];
    const map = buildExpenseMap(expenses);
    expect(map['a']).toBe(100.5);
  });
});
