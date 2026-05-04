import { useMemo } from 'react';
import { toDateStr, calcNights } from './utils';
import ItemCard from '../plan/ItemCard';

export default function ScheduleList({ items, stop, onItemTap, selectedDate, livePrices, expenseMap }) {
  const nights = calcNights(stop);
  const startStr = toDateStr(stop.start_date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const dateLabels = useMemo(() => {
    if (selectedDate || nights <= 1) return null;
    const labels = {};
    const [sy, sm, sd] = startStr.split('-').map(Number);
    for (let i = 0; i <= nights; i++) {
      const d = new Date(sy, sm - 1, sd + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      labels[ds] = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
    }
    return labels;
  }, [nights, startStr, selectedDate]);

  const groupedItems = useMemo(() => {
    if (!dateLabels || nights <= 1) return [{ label: null, items }];
    const dateKeys = Object.keys(dateLabels);
    const byDate = {};
    const unassigned = [];
    items.forEach(it => {
      if (it.start_time && it.start_time.includes('T')) {
        const itemDate = it.start_time.split('T')[0];
        if (dateLabels[itemDate]) { (byDate[itemDate] = byDate[itemDate] || []).push(it); return; }
      }
      unassigned.push(it);
    });
    if (Object.keys(byDate).length > 0) {
      const groups = [];
      dateKeys.forEach(dk => {
        const dayItems = byDate[dk] || [];
        if (dk === dateKeys[0]) dayItems.push(...unassigned);
        if (dayItems.length > 0) groups.push({ label: dateLabels[dk], items: dayItems });
      });
      return groups.length > 0 ? groups : [{ label: null, items }];
    }
    const perDay = Math.ceil(items.length / nights);
    return dateKeys.map((dk, i) => {
      const dayItems = items.slice(i * perDay, (i + 1) * perDay);
      return dayItems.length > 0 ? { label: dateLabels[dk], items: dayItems } : null;
    }).filter(Boolean);
  }, [items, dateLabels, nights]);

  return (
    <div className="itin-schedule">
      {groupedItems.map((group, gi) => (
        <div key={gi}>
          {group.label && <div className="itin-sched-date">{group.label}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: group.label ? '8px 0' : 0 }}>
            {group.items.map(it => (
              <ItemCard key={it.id} it={it} onTap={onItemTap}
                livePrice={livePrices?.[it.id]?.perNight}
                expenseAmount={(expenseMap || {})[it.id] || 0} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
