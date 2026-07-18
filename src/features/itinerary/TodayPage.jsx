import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTripData, useTripActions } from "../../shared/hooks/TripContext";
import DetailModal from "../../shared/components/DetailModal";
import ExpenseCard from "../../shared/components/ExpenseCard";
import OverviewView from "./OverviewView";
import StopSection from "./StopSection";
import StatusFilter from "./StatusFilter";
import { formatStopDate, getTodayDayIndex } from "./utils";

export default function TodayPage() {
  const {
    items,
    stops,
    livePrices,
    expenses,
    files,
    places,
    expenseMap,
    email,
  } = useTripData();
  const {
    updateItem,
    deleteItem,
    updateStop,
    deleteStop,
    setStatus,
    addExpense,
    updateExpense,
    deleteExpense,
    addItem,
    setFile,
    removeFile,
    getPlaceData,
  } = useTripActions();
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const todayIdx = getTodayDayIndex(stops);
  const isDuringTrip = todayIdx !== null;
  const [view, setView] = useState(
    isDuringTrip ? { type: "stop", idx: todayIdx } : "overview",
  );
  const selectorRef = useRef(null);
  const handleCloseDetail = useCallback(() => setSelectedItem(null), []);

  // Resolve which stops to display based on view
  const activeStops = useMemo(() => {
    if (view === "overview") return [];
    return stops[view.idx] ? [stops[view.idx]] : [];
  }, [view, stops]);

  const isActive = (stopIdx) =>
    view !== "overview" && view.type === "stop" && view.idx === stopIdx;

  useEffect(() => {
    if (stops.length > 0 && view === "overview") {
      const idx = getTodayDayIndex(stops);
      if (idx !== null) setView({ type: "stop", idx });
    }
  }, [stops.length]); // only run when stops first load

  useEffect(() => {
    if (selectorRef.current && view !== "overview") {
      const sel = selectorRef.current.querySelector('[data-active="true"]');
      if (sel)
        sel.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
    }
  }, [view]);

  return (
    <div className="page active">
      {/* Pills: stops */}
      <div className="today-selector" ref={selectorRef}>
        <button
          className={`itin-overview-pill ${view === "overview" ? "active" : ""}`}
          onClick={() => setView("overview")}
        >
          Overview
        </button>
        {isDuringTrip && !isActive(todayIdx) && (
          <button
            className="today-sel-pill today-pill-accent"
            onClick={() => setView({ type: "stop", idx: todayIdx })}
          >
            Today
          </button>
        )}
        {stops.map((s, i) => (
          <button
            key={s.id}
            data-active={isActive(i) ? "true" : "false"}
            className={`today-sel-pill today-sel-pill-stop ${isActive(i) ? "active" : ""} ${i === todayIdx ? "is-today" : ""}`}
            onClick={() => setView({ type: "stop", idx: i })}
            style={{ borderLeftColor: "var(--accent)" }}
          >
            <span className="pill-stop-name" title={s.name}>
              {s.name}
            </span>
            <span className="pill-stop-date">{formatStopDate(s)}</span>
          </button>
        ))}
      </div>

      {/* Status filter (not shown on overview) */}
      {view !== "overview" && (
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      )}

      {/* Content: overview or stop section */}
      {view === "overview" ? (
        <OverviewView
          items={items}
          stops={stops}
          expenses={expenses}
          onItemTap={setSelectedItem}
          onDaySelect={(idx) => setView({ type: "stop", idx })}
        />
      ) : (
        activeStops.map((stop) => (
          <StopSection
            key={stop.id}
            stop={stop}
            items={items}
            expenses={expenses}
            onItemTap={setSelectedItem}
            places={places}
            statusFilter={statusFilter}
            updateStop={updateStop}
            deleteStop={deleteStop}
            updateItem={updateItem}
            addItem={addItem}
            addExpense={addExpense}
            setFile={setFile}
            userEmail={email}
            stops={stops}
            showTitle={false}
            livePrices={livePrices}
            expenseMap={expenseMap}
            onExpenseTap={setSelectedExpense}
          />
        ))
      )}
      {activeStops.length === 0 && view !== "overview" && (
        <div className="itin-empty">
          <div className="itin-empty-text">No stops for this date.</div>
        </div>
      )}

      {selectedExpense && (
        <ExpenseCard
          expense={selectedExpense}
          item={selectedExpense.item}
          stops={stops}
          onClose={() => setSelectedExpense(null)}
          onViewItem={() => {
            const it = selectedExpense.item;
            setSelectedExpense(null);
            if (it) setSelectedItem(it);
          }}
          addExpense={addExpense}
          updateExpense={updateExpense}
          deleteExpense={deleteExpense}
        />
      )}

      {/* DetailModal */}
      {selectedItem &&
        (() => {
          const liveItem =
            items.find((i) => i.id === selectedItem.id) || selectedItem;
          const itemExpenses = (expenses || []).filter(
            (e) => e.item_id === liveItem.id,
          );
          const exp = itemExpenses.reduce(
            (s, e) => s + Number(e.amount || 0),
            0,
          );
          return (
            <DetailModal
              it={liveItem}
              status={liveItem.status || ""}
              setStatus={setStatus}
              updateItem={updateItem}
              stops={stops}
              files={files[selectedItem.id]}
              setFile={setFile}
              removeFile={removeFile}
              placeData={places?.[selectedItem.id]}
              getPlaceData={getPlaceData}
              livePrice={livePrices?.[selectedItem.id]?.perNight}
              livePriceRates={livePrices?.[selectedItem.id]?.allRates}
              expenseAmount={exp}
              itemExpenses={itemExpenses}
              addExpense={addExpense}
              updateExpense={updateExpense}
              deleteExpense={deleteExpense}
              onClose={handleCloseDetail}
              onDelete={() => {
                deleteItem(liveItem.id);
                setSelectedItem(null);
              }}
            />
          );
        })()}
    </div>
  );
}
