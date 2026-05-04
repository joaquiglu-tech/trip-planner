import { describe, it, expect } from 'vitest';

// Test the BudgetSummary calculation logic directly
function calculateBudget(items, expenses) {
  const byType = {};
  let selTotal = 0, confTotal = 0, selCount = 0, confCount = 0;

  items.forEach(it => {
    if (it.status !== 'sel' && it.status !== 'conf') return;
    const typeKey = it.type === 'food' ? 'food' : it.type;
    if (!byType[typeKey]) byType[typeKey] = { sel: 0, conf: 0 };
    selCount++;

    const est = Number(it.estimated_cost) || 0;

    if (it.status === 'conf') {
      confCount++;
      const exp = (expenses || []).filter(e => e.item_id === it.id).reduce((s, e) => s + Number(e.amount || 0), 0);
      const val = exp > 0 ? exp : est;
      selTotal += val;
      byType[typeKey].sel += val;
    } else {
      selTotal += est;
      byType[typeKey].sel += est;
    }
  });

  (expenses || []).forEach(e => {
    const amt = Number(e.amount || 0);
    if (amt <= 0) return;
    const item = items.find(i => i.id === e.item_id);
    const typeKey = item ? (item.type === 'food' ? 'food' : item.type) : 'other';
    if (!byType[typeKey]) byType[typeKey] = { sel: 0, conf: 0 };
    confTotal += amt;
    byType[typeKey].conf += amt;
  });

  return { byType, selTotal, confTotal, selCount, confCount };
}

describe('BudgetSummary calculations', () => {
  const items = [
    { id: '1', name: 'Hotel', type: 'stay', status: 'conf', estimated_cost: 500 },
    { id: '2', name: 'Restaurant', type: 'food', status: 'sel', estimated_cost: 80 },
    { id: '3', name: 'Museum', type: 'activity', status: 'sel', estimated_cost: 30 },
    { id: '4', name: 'Unselected', type: 'food', status: '', estimated_cost: 50 },
  ];

  const expenses = [
    { id: 'e1', item_id: '1', amount: 450 },
  ];

  it('counts selected items correctly (sel + conf)', () => {
    const result = calculateBudget(items, expenses);
    expect(result.selCount).toBe(3); // hotel(conf) + restaurant(sel) + museum(sel)
  });

  it('does not count unselected items', () => {
    const result = calculateBudget(items, expenses);
    expect(result.selCount).toBe(3); // not 4
  });

  it('uses expense amount for confirmed items in selected total', () => {
    const result = calculateBudget(items, expenses);
    // Hotel: expense 450 (not estimate 500) + Restaurant: 80 + Museum: 30
    expect(result.selTotal).toBe(560);
  });

  it('confirmed total sums all expenses', () => {
    const result = calculateBudget(items, expenses);
    expect(result.confTotal).toBe(450);
  });

  it('groups by type correctly', () => {
    const result = calculateBudget(items, expenses);
    expect(result.byType.stay.sel).toBe(450); // expense value
    expect(result.byType.food.sel).toBe(80);
    expect(result.byType.activity.sel).toBe(30);
    expect(result.byType.stay.conf).toBe(450);
  });

  it('handles no expenses', () => {
    const result = calculateBudget(items, []);
    expect(result.confTotal).toBe(0);
    // Hotel uses estimate since no expense
    expect(result.selTotal).toBe(610); // 500 + 80 + 30
  });

  it('handles empty items', () => {
    const result = calculateBudget([], []);
    expect(result.selTotal).toBe(0);
    expect(result.confTotal).toBe(0);
    expect(result.selCount).toBe(0);
  });
});
