import { useMemo } from 'react';
import { toDateStr, calcNights, formatTime } from './utils';

const TRANSPORT_ICON = { flight: '\u2708', train: '\u{1F686}', bus: '\u{1F68C}', drive: '\u{1F697}', taxi: '\u{1F695}', ferry: '\u26F4', walk: '\u{1F6B6}', bicycle: '\u{1F6B2}', rental: '\u{1F511}' };

// selectedDate: optional YYYY-MM-DD string. When provided, skip date grouping headers (single day view).
export default function ScheduleList({ items, stop, onItemTap, selectedDate }) {
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
    // Single date view or single-night stop — no grouping needed
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
    // Fallback: distribute evenly
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
          {group.items.map(it => (
            <div key={it.id} className={`itin-sched-row ${it.status}`} onClick={() => onItemTap(it)}>
              <div className="itin-sched-time">
                {it.start_time ? formatTime(it.start_time) : ''}
                {it.end_time && <span className="itin-sched-end">{formatTime(it.end_time)}</span>}
              </div>
              <div className="itin-sched-dot-col"><div className={`itin-sched-dot ${it.status}`} /><div className="itin-sched-line" /></div>
              <div className="itin-sched-info">
                <div className="itin-sched-name">
                  {it.type === 'transport' && <span style={{ marginRight: 4 }}>{TRANSPORT_ICON[it.transport_mode] || '\u2708'}</span>}
                  {it.name}
                </div>
                <div className="itin-sched-sub">
                  {it.type === 'transport' ? (it.routeLabel || it.route || '') : it.dish ? it.dish : it.hrs ? `${it.hrs}h` : ''}
                </div>
              </div>
              <div className="itin-sched-actions">
                {it.status === 'conf' && <span className="itin-sched-check">Booked</span>}
                {it.coord && <a href={`https://www.google.com/maps/dir/?api=1&destination=${it.coord.lat},${it.coord.lng}`} target="_blank" rel="noopener" className="itin-action-sm" onClick={e => e.stopPropagation()}>Go</a>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
