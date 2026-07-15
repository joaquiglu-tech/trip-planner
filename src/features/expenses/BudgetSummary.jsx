import { useState, useMemo } from "react";
import { $f, computeBudgetTotals } from "../../shared/hooks/useItems";

const TYPE_LABELS = {
  stay: "Stays",
  activity: "Activities",
  food: "Food",
  transport: "Transport",
};
const TYPE_ORDER = ["stay", "activity", "food", "transport"];

export default function BudgetSummary({ items, expenses }) {
  const [expanded, setExpanded] = useState(false);

  // Single source of truth shared with OverviewView (C4)
  const data = useMemo(
    () => computeBudgetTotals(items, expenses),
    [items, expenses],
  );

  const pct = data.selCount
    ? Math.round((data.confCount / data.selCount) * 100)
    : 0;

  return (
    <div
      className="budget-summary"
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: "pointer" }}
    >
      <div className="budget-row-main">
        <div>
          <div className="budget-label">Selected (est.)</div>
          <div className="budget-amount">{$f(data.selTotal)}</div>
        </div>
        <div>
          <div className="budget-label">Confirmed</div>
          <div className="budget-amount green">
            {data.confTotal > 0 ? $f(data.confTotal) : "—"}
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <div className="prog-bar" style={{ marginTop: 10 }}>
            <div className="prog-fill" style={{ width: pct + "%" }}></div>
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#888",
              marginTop: 3,
              textAlign: "center",
            }}
          >
            {data.confCount} booked / {data.selCount} selected
          </div>

          <div className="summary-breakdown">
            <div className="summary-bd-header">
              <span></span>
              <span>Selected</span>
              <span>Confirmed</span>
            </div>
            {[...TYPE_ORDER, "other"].map((key) => {
              const row = data.byType[key];
              if (!row) return null;
              return (
                <div key={key} className="summary-bd-row">
                  <span className="summary-bd-label">
                    {TYPE_LABELS[key] || "Other"}
                  </span>
                  <span className="summary-bd-val">
                    {row.sel > 0 ? $f(row.sel) : "—"}
                  </span>
                  <span className="summary-bd-val conf">
                    {row.conf > 0 ? $f(row.conf) : "—"}
                  </span>
                </div>
              );
            })}
            <div className="summary-bd-row summary-bd-total">
              <span className="summary-bd-label">Total</span>
              <span className="summary-bd-val">{$f(data.selTotal)}</span>
              <span className="summary-bd-val conf">
                {data.confTotal > 0 ? $f(data.confTotal) : "—"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
