import { useMemo } from "react";
import { toDateStr, calcNights, groupScheduleItems } from "./utils";
import ItemCard from "../plan/ItemCard";

export default function ScheduleList({
  items,
  stop,
  onItemTap,
  selectedDate,
  livePrices,
  expenseMap,
  itemNumberMap,
}) {
  const nights = calcNights(stop);
  const startStr = toDateStr(stop.start_date);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dateLabels = useMemo(() => {
    if (selectedDate || nights <= 1) return null;
    const labels = {};
    const [sy, sm, sd] = startStr.split("-").map(Number);
    for (let i = 0; i <= nights; i++) {
      const d = new Date(sy, sm - 1, sd + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      labels[ds] = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
    }
    return labels;
  }, [nights, startStr, selectedDate]);

  const groupedItems = useMemo(() => {
    if (!dateLabels || nights <= 1) return [{ label: null, items }];
    return groupScheduleItems(items, dateLabels);
  }, [items, dateLabels, nights]);

  return (
    <div className="itin-schedule">
      {groupedItems.map((group, gi) => (
        <div key={gi}>
          {group.label && <div className="itin-sched-date">{group.label}</div>}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: group.label ? "8px 0" : 0,
            }}
          >
            {group.items.map((it) => (
              <ItemCard
                key={it.id}
                it={it}
                onTap={onItemTap}
                livePrice={livePrices?.[it.id]?.perNight}
                expenseAmount={(expenseMap || {})[it.id] || 0}
                number={itemNumberMap?.[it.id]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
