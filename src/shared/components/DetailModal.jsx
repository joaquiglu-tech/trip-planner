import { useState, useEffect, useRef, useCallback } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { $f, isXoteloManaged } from "../hooks/useItems";
import {
  buildItemChanges,
  clearExpensesForDowngrade,
} from "./detailModalLogic";
import { useTripData } from "../hooks/TripContext";
import { uploadFile, deleteFile } from "../../services/storage";
import { extractXoteloKey, fetchStayEstimate } from "../../services/xotelo";
import { useConfirm } from "../hooks/useConfirm";
import ConfirmModal from "./ConfirmModal";
import PlaceSearch from "./PlaceSearch";
import ExpenseCard from "./ExpenseCard";

const TYPE_LABEL = {
  transport: "Transport",
  stay: "Stay",
  activity: "Activity",
  food: "Food",
};
const TYPE_OPTIONS = [
  { value: "food", label: "Food" },
  { value: "stay", label: "Stay" },
  { value: "activity", label: "Activity" },
  { value: "transport", label: "Transport" },
];
const SUBCAT_OPTIONS = [
  { value: "", label: "None" },
  { value: "bourdain", label: "Bourdain" },
  { value: "michelin", label: "Michelin" },
  { value: "local", label: "Local pick" },
  { value: "bar", label: "Bar/Aperitivo" },
  { value: "cheap", label: "Cheap eats" },
];
const TIER_OPTIONS = [
  { value: "", label: "None" },
  { value: "Budget", label: "Budget" },
  { value: "Mid-range", label: "Mid-range" },
  { value: "Boutique", label: "Boutique" },
  { value: "Luxury", label: "Luxury" },
];
const TRANSPORT_MODES = [
  { value: "flight", label: "Flight" },
  { value: "train", label: "Train" },
  { value: "bus", label: "Bus" },
  { value: "rental", label: "Rental" },
  { value: "drive", label: "Drive" },
  { value: "ferry", label: "Ferry" },
  { value: "taxi", label: "Taxi" },
];
const SUBCAT_BADGE = {
  bourdain: "Bourdain",
  michelin: "Michelin",
  local: "Local pick",
  bar: "Bar/Aperitivo",
  cheap: "Cheap eats",
};
const PRICE_LEVEL_LABEL = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};
const TRANSPORT_ICON = {
  flight: "\u2708",
  train: "\u{1F686}",
  bus: "\u{1F68C}",
  drive: "\u{1F697}",
  taxi: "\u{1F695}",
  ferry: "\u26F4",
  walk: "\u{1F6B6}",
  bicycle: "\u{1F6B2}",
  rental: "\u{1F511}",
};

function getBookingUrl(source, hotelName, city) {
  const q = encodeURIComponent(`${hotelName} ${city}`);
  const urls = {
    "Booking.com": `https://www.booking.com/searchresults.html?ss=${q}`,
    "Agoda.com": `https://www.agoda.com/search?q=${q}`,
    "Trip.com": `https://www.trip.com/hotels/?keyword=${q}`,
    "Hotels.com": `https://www.hotels.com/search.do?q-destination=${q}`,
    Expedia: `https://www.expedia.com/Hotel-Search?destination=${q}`,
  };
  return urls[source] || `https://www.google.com/travel/hotels?q=${q}`;
}

function formatDatetime(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return dt;
  }
}

// L33: presentational 3-button status selector, shared by Summary and Edit.
// Each parent supplies its own async onSelect (Summary opens the expense card
// on conf; Edit doesn't) — the button rendering is what was duplicated.
const STATUS_OPTIONS = [
  { value: "", label: "Not added", cls: "", icon: "○" },
  { value: "sel", label: "Selected", cls: "sel", icon: "●" },
  { value: "conf", label: "Confirmed", cls: "conf", icon: "✓" },
];

function StatusSelector({ current, onSelect, style }) {
  return (
    <div className="status-selector" style={style}>
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`status-option ${opt.cls} ${current === opt.value ? "active" : ""}`}
          onClick={() => onSelect(opt.value)}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}

// L34: the file-chip list rendered identically in both modes.
function FileChipList({ files, onRemove }) {
  return files.map((f, i) => (
    <div key={i} className="file-chip mb-2">
      <span className="file-chip-name">{f.name}</span>
      <a
        href={f.url}
        target="_blank"
        rel="noopener"
        className="file-action-link"
      >
        Open
      </a>
      <button onClick={() => onRemove(f.path)} className="file-remove-btn">
        x
      </button>
    </div>
  ));
}

export default function DetailModal({
  it,
  status,
  setStatus,
  updateItem,
  onClose,
  onDelete,
  files,
  setFile,
  removeFile,
  placeData,
  getPlaceData,
  livePrice,
  livePriceRates,
  expenseAmount,
  itemExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  stops,
}) {
  const { email } = useTripData();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const trapRef = useFocusTrap();
  const st = status || it.status || "";
  const [editing, setEditing] = useState(false);
  const [showExpenseCard, setShowExpenseCard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [place, setPlace] = useState(placeData || null);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [saved, setSaved] = useState("");
  const itemFiles = files || [];

  const savedTimerRef = useRef(null);
  function showSaved(label) {
    setSaved(label);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(""), 1500);
  }
  // L07: clear the "Saved" timer on unmount.
  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  useEffect(() => {
    window.history.pushState({ modal: true }, "", "");
    function handlePop() {
      onClose();
    }
    // L10: close on Escape, consistent with the Add modals.
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("popstate", handlePop);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!it) return;
    let cancelled = false;
    // M16: reset to this item's own place data so a reused modal never shows
    // the previous item's photo/address while (or instead of) refetching.
    setPlace(placeData || null);
    if (!placeData?.photo_url && getPlaceData) {
      setLoadingPlace(true);
      getPlaceData(it.id, it.name, it.city)
        .then((result) => {
          if (!cancelled && result) setPlace(result);
        })
        .catch((err) => console.warn("getPlaceData failed:", err))
        .finally(() => {
          if (!cancelled) setLoadingPlace(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [it?.id]);

  if (!it) return null;

  const heroImage = place?.photo_url || it.imageUrl || null;
  const photoUrls =
    place?.photo_urls?.length > 0
      ? place.photo_urls
      : heroImage
        ? [heroImage]
        : [];
  const googleRating = place?.rating || null;
  const googleAddress = place?.address || it.address || null;
  const googlePhone = place?.phone || null;
  const googleHours = place?.hours?.length ? place.hours : null;
  const priceLvl = place?.price_level
    ? PRICE_LEVEL_LABEL[place.price_level]
    : null;
  const faviconUrl = it.link
    ? (() => {
        try {
          return `https://www.google.com/s2/favicons?domain=${new URL(it.link).hostname}&sz=64`;
        } catch {
          return null;
        }
      })()
    : null;

  async function handleUpload(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("File too large (max 5MB)");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFile(it.id, f);
      if (setFile) setFile(it.id, result);
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  }

  async function handleRemoveFile(filePath) {
    try {
      await deleteFile(filePath);
    } catch (err) {
      console.warn("File delete failed:", err);
      alert("Failed to delete file.");
      return;
    }
    if (removeFile) removeFile(it.id, filePath);
  }

  // ═══ EDIT MODE — all fields, batch save ═══
  if (editing) {
    return (
      <EditMode
        it={it}
        stops={stops}
        livePrice={livePrice}
        livePriceRates={livePriceRates}
        expenseAmount={expenseAmount}
        onExpenseClick={() => {
          setEditing(false);
          setShowExpenseCard(true);
        }}
        updateItem={updateItem}
        onClose={() => setEditing(false)}
        showSaved={showSaved}
        saved={saved}
        itemFiles={itemFiles}
        uploading={uploading}
        handleUpload={handleUpload}
        handleRemoveFile={handleRemoveFile}
        setStatus={setStatus}
        status={st}
        itemExpenses={itemExpenses}
        deleteExpense={deleteExpense}
      />
    );
  }

  // ═══ SUMMARY MODE — populated fields + read-only API data ═══
  return (
    <div
      className="detail-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Item details"
    >
      <div
        className="detail-sheet"
        ref={trapRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Photos */}
        {photoUrls.length > 1 ? (
          <PhotoCarousel photos={photoUrls} name={it.name} />
        ) : heroImage ? (
          <div className="detail-hero">
            <img
              src={heroImage}
              alt={it.name}
              onError={(e) => {
                e.target.parentElement.style.display = "none";
              }}
            />
            <div className="detail-hero-gradient" />
          </div>
        ) : loadingPlace ? (
          <div className="detail-hero-loading" />
        ) : null}

        {/* Status selector — saves immediately */}
        <div className="detail-action-top">
          <div className="flex-center gap-2">
            <div className="flex-1">
              <StatusSelector
                current={st}
                onSelect={async (value) => {
                  if (value === st) return;
                  if (navigator.vibrate) navigator.vibrate(15);
                  if (value === "conf" && st !== "conf") {
                    try {
                      await setStatus(it.id, "conf"); // M20: await
                    } catch (err) {
                      console.warn("Failed to set status:", err);
                      alert("Failed to update status.");
                      return;
                    }
                    setShowExpenseCard(true);
                    return;
                  }
                  const res = await clearExpensesForDowngrade({
                    current: st,
                    next: value,
                    itemExpenses,
                    expenseAmount,
                    confirm,
                    deleteExpense,
                  });
                  if (res.error) alert(res.error); // M18
                  if (!res.proceed) return;
                  try {
                    await setStatus(it.id, value); // M20
                  } catch (err) {
                    console.warn("Failed to set status:", err);
                    alert("Failed to update status.");
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="detail-content">
          {saved && <div className="detail-saved">{saved}</div>}

          {/* Badges */}
          <div className="detail-badges">
            <span className={`badge b-${it.type}`}>
              {TYPE_LABEL[it.type] || it.type}
            </span>
            {it.city && <span className="badge b-city">{it.city}</span>}
            {googleRating && (
              <span className="badge badge-rating">Rating {googleRating}</span>
            )}
            {priceLvl && <span className="badge badge-price">{priceLvl}</span>}
            {it.subcat && SUBCAT_BADGE[it.subcat] && (
              <span className="badge">{SUBCAT_BADGE[it.subcat]}</span>
            )}
            {it.tier && <span className="badge b-bar">{it.tier}</span>}
            {it.transport_mode && (
              <span className="badge">
                {TRANSPORT_ICON[it.transport_mode] || ""}{" "}
                {
                  TRANSPORT_MODES.find((m) => m.value === it.transport_mode)
                    ?.label
                }
              </span>
            )}
          </div>

          <h2 className="detail-name">{it.name}</h2>

          {/* Google Places (read-only) */}
          {googleAddress && (
            <div className="detail-address">{googleAddress}</div>
          )}
          {googlePhone && <div className="detail-address">{googlePhone}</div>}
          {googleHours && (
            <details className="detail-hours">
              <summary>Opening hours</summary>
              <ul>
                {googleHours.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Populated user fields — only show if filled */}
          {it.description && (
            <p className="detail-desc-full">{it.description}</p>
          )}
          {it.type === "food" && it.dish && (
            <div className="detail-dish-block">
              <span className="detail-dish-label">What to order</span>
              <span className="detail-dish-text">{it.dish}</span>
            </div>
          )}
          {it.type === "transport" && (it.routeLabel || it.route) && (
            <div className="detail-times-bar">
              <span className="detail-route">{it.routeLabel || it.route}</span>
            </div>
          )}
          {(it.start_time || it.end_time) && (
            <div className="detail-times-bar">
              {it.start_time && (
                <span className="detail-time">
                  Start: {formatDatetime(it.start_time)}
                </span>
              )}
              {it.end_time && (
                <span className="detail-time">
                  End: {formatDatetime(it.end_time)}
                </span>
              )}
            </div>
          )}
          {it.type === "activity" && it.hrs && (
            <div className="detail-duration">Duration: {it.hrs}h</div>
          )}
          {it.highlights && (
            <ul className="detail-tips">
              {it.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
          {it.type === "food" && it.quote && (
            <blockquote className="detail-quote">
              "{it.quote}"{it.quoteSource && <cite>— {it.quoteSource}</cite>}
            </blockquote>
          )}
          {(it.whatToExpect || it.proTips) && (
            <details className="detail-section detail-collapsible">
              <summary className="detail-section-title detail-collapsible-summary">
                More details
              </summary>
              {it.whatToExpect && (
                <ul className="detail-tips mt-2">
                  {it.whatToExpect.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              {it.proTips && (
                <ul className="detail-tips mt-2">
                  {it.proTips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </details>
          )}
          {it.reserveNote && (
            <div className="detail-reserve-note">{it.reserveNote}</div>
          )}

          {/* ═══ PRICING ═══ */}
          <PricingBlock
            it={it}
            livePrice={livePrice}
            expenseAmount={expenseAmount}
            onExpenseClick={() => setShowExpenseCard(true)}
          />

          {/* ═══ BOOKING ═══ */}
          {it.type === "stay" && livePriceRates?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">
                Book — live prices per night
              </div>
              {livePriceRates.map((rate, i) => (
                <a
                  key={i}
                  href={getBookingUrl(rate.source, it.name, it.city)}
                  target="_blank"
                  rel="noopener"
                  className="transport-option"
                >
                  <div className="transport-option-info">
                    <span className="transport-option-name">{rate.source}</span>
                    <span className="transport-option-detail">
                      Per night incl. tax
                    </span>
                  </div>
                  <span className="transport-option-price">
                    {$f(rate.per_night)}
                  </span>
                </a>
              ))}
            </div>
          )}
          {it.type === "stay" &&
            !livePriceRates?.length &&
            it.options?.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Compare & Book</div>
                {it.options.map((opt, i) => (
                  <a
                    key={i}
                    href={opt.url}
                    target="_blank"
                    rel="noopener"
                    className="transport-option"
                  >
                    <div className="transport-option-info">
                      <span className="transport-option-name">{opt.name}</span>
                      {opt.detail && (
                        <span className="transport-option-detail">
                          {opt.detail}
                        </span>
                      )}
                    </div>
                    <span className="transport-option-price">{opt.price}</span>
                  </a>
                ))}
              </div>
            )}
          {it.type === "transport" && it.options?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Booking options</div>
              {it.options.map((opt, i) => (
                <a
                  key={i}
                  href={opt.url}
                  target="_blank"
                  rel="noopener"
                  className="transport-option"
                >
                  <div className="transport-option-info">
                    <span className="transport-option-name">{opt.name}</span>
                    {opt.detail && (
                      <span className="transport-option-detail">
                        {opt.detail}
                      </span>
                    )}
                  </div>
                  <span className="transport-option-price">{opt.price}</span>
                </a>
              ))}
            </div>
          )}

          {/* ═══ LINKS ═══ */}
          {it.link && (
            <div className="mt-3">
              <a
                href={it.link}
                target="_blank"
                rel="noopener"
                className="detail-book-link"
              >
                {faviconUrl && (
                  <img src={faviconUrl} alt="" className="detail-favicon" />
                )}
                <span>Book / Reserve</span>
              </a>
            </div>
          )}
          {it.src && (
            <div className="detail-source-block">
              <span className="detail-source-label">Recommended by</span>
              <div className="detail-source-val">{it.src}</div>
            </div>
          )}
          {it.notes && (
            <div className="detail-section mt-3">
              <div className="detail-section-title">Notes</div>
              <p className="text-sm2 text-secondary whitespace-pre">
                {it.notes}
              </p>
            </div>
          )}

          {/* Files */}
          {itemFiles.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">
                Attachments ({itemFiles.length})
              </div>
              <FileChipList files={itemFiles} onRemove={handleRemoveFile} />
            </div>
          )}
          {(st === "sel" || st === "conf") && (
            <div className="detail-upload-row">
              <label className="detail-upload-btn">
                {uploading
                  ? "Uploading..."
                  : `Upload ${itemFiles.length > 0 ? "another " : ""}file`}
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden-input"
                  onChange={handleUpload}
                />
              </label>
            </div>
          )}
        </div>

        <div className="detail-edit-actions">
          <button
            className="detail-btn sel flex-1"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
        {onDelete && (
          <div style={{ padding: "0 16px 16px" }}>
            <button
              className="detail-btn-delete"
              onClick={async () => {
                const confirmed = await confirm(
                  "Delete this item permanently? This cannot be undone.",
                  { destructive: true, confirmLabel: "Delete" },
                );
                if (confirmed) onDelete();
              }}
            >
              Delete permanently
            </button>
          </div>
        )}
      </div>

      {/* ExpenseCard overlay — opened from PricingBlock or confirm flow */}
      {showExpenseCard && (
        <ExpenseCard
          expense={(itemExpenses || [])[0] || null}
          item={it}
          stops={stops}
          onClose={() => setShowExpenseCard(false)}
          addExpense={addExpense}
          updateExpense={updateExpense}
          deleteExpense={deleteExpense}
          setStatus={setStatus}
          email={email}
        />
      )}
      <ConfirmModal
        state={confirmState}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

// ═══ EDIT MODE — batch save ═══
function EditMode({
  it,
  stops,
  livePrice,
  expenseAmount,
  onExpenseClick,
  updateItem,
  onClose,
  showSaved,
  saved,
  itemFiles,
  uploading,
  handleUpload,
  handleRemoveFile,
  setStatus,
  status,
  itemExpenses,
  deleteExpense,
}) {
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const trapRef = useFocusTrap();
  const [draft, setDraft] = useState({
    name: it.name || "",
    type: it.type || "food",
    description: it.description || "",
    dish: it.dish || "",
    link: it.link || "",
    notes: it.notes || "",
    src: it.src || "",
    reserve_note: it.reserve_note || "",
    estimated_cost: it.estimated_cost ? String(Number(it.estimated_cost)) : "",
    start_time: it.start_time || "",
    end_time: it.end_time || "",
    stop_ids: it.stop_ids || [],
    subcat: it.subcat || "",
    tier: it.tier || "",
    transport_mode: it.transport_mode || "",
    is_rental: !!it.is_rental,
    origin: it.origin_name
      ? { name: it.origin_name, lat: it.origin_lat, lng: it.origin_lng }
      : null,
    dest: it.dest_name
      ? { name: it.dest_name, lat: it.dest_lat, lng: it.dest_lng }
      : null,
    hrs: it.hrs ? String(it.hrs) : "",
    xotelo_key: it.xotelo_key || "",
  });
  const [tripadvisorUrl, setTripadvisorUrl] = useState(
    it.xotelo_key
      ? `tripadvisor.com/Hotel_Review-${it.xotelo_key}-Reviews`
      : "",
  );
  const [xoteloStatus, setXoteloStatus] = useState(
    it.xotelo_key ? "found" : "",
  );
  // M25: debounce + request counter so keystrokes don't fire overlapping
  // fetches and a stale response can't overwrite a newer estimate.
  const xoteloReqRef = useRef(0);
  const xoteloTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(xoteloTimerRef.current), []);

  function handleTripAdvisorUrl(url) {
    setTripadvisorUrl(url);
    clearTimeout(xoteloTimerRef.current);
    const key = extractXoteloKey(url);
    if (!key) {
      setXoteloStatus(url.length > 10 ? "not_found" : "");
      return;
    }
    u("xotelo_key", key);
    setXoteloStatus("searching");
    const firstStop = (stops || []).find((s) => draft.stop_ids.includes(s.id));
    const checkIn = firstStop
      ? String(firstStop.start_date).substring(0, 10)
      : null;
    const checkOut = firstStop
      ? String(firstStop.end_date).substring(0, 10)
      : null;
    if (!checkIn || !checkOut) {
      setXoteloStatus("found"); // key valid, assign a stop to get rates
      return;
    }
    const reqId = ++xoteloReqRef.current;
    xoteloTimerRef.current = setTimeout(async () => {
      try {
        const estimate = await fetchStayEstimate(key, checkIn, checkOut);
        if (reqId !== xoteloReqRef.current) return; // superseded
        if (estimate) u("estimated_cost", String(estimate.estimated_cost));
        setXoteloStatus("found");
      } catch (err) {
        console.warn("Xotelo estimate failed:", err);
        if (reqId === xoteloReqRef.current) setXoteloStatus("found");
      }
    }, 400);
  }
  const [saving, setSaving] = useState(false);

  const u = (key, val) => setDraft((d) => ({ ...d, [key]: val }));

  // M21: warn if the item was changed elsewhere (realtime) while editing, so a
  // save doesn't silently clobber the other change.
  const initialUpdatedAt = useRef(it.updated_at);
  const [externallyChanged, setExternallyChanged] = useState(false);
  useEffect(() => {
    if (it.updated_at !== initialUpdatedAt.current) setExternallyChanged(true);
  }, [it.updated_at]);

  // M17: opening the expense card leaves Edit mode and discards the draft —
  // confirm first when there are unsaved changes.
  async function handleExpenseClick() {
    if (Object.keys(buildItemChanges(draft, it)).length > 0) {
      const ok = await confirm(
        "You have unsaved edits. Leave without saving them?",
        { destructive: true, confirmLabel: "Leave" },
      );
      if (!ok) return;
    }
    onExpenseClick();
  }

  async function handleSave() {
    // M24: a name is required — don't persist an empty/whitespace one.
    if (!draft.name.trim()) {
      alert("Name is required.");
      return;
    }
    setSaving(true);
    const changes = buildItemChanges(draft, it);

    if (Object.keys(changes).length > 0) {
      try {
        await updateItem(it.id, changes);
        showSaved("Saved");
      } catch (err) {
        console.warn("Save failed:", err);
        alert("Failed to save changes.");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Edit item"
    >
      <div className="detail-sheet" ref={trapRef}>
        <div className="detail-action-top flex-between">
          <div style={{ fontSize: 14, fontWeight: 700 }}>Edit {it.name}</div>
          <button
            className="detail-close"
            onClick={onClose}
            aria-label="Cancel edit"
          >
            ✕
          </button>
        </div>
        <div className="detail-content">
          {saved && <div className="detail-saved">{saved}</div>}
          {externallyChanged && (
            <div
              className="detail-saved"
              style={{ background: "var(--warning, #b45309)" }}
            >
              This item was updated elsewhere. Saving will overwrite that
              change.
            </div>
          )}

          {/* Status — saves immediately, not batched */}
          {setStatus && (
            <StatusSelector
              current={status || ""}
              style={{ margin: "12px 0" }}
              onSelect={async (value) => {
                if (value === (status || "")) return;
                if (navigator.vibrate) navigator.vibrate(15);
                const res = await clearExpensesForDowngrade({
                  current: status || "",
                  next: value,
                  itemExpenses,
                  expenseAmount,
                  confirm,
                  deleteExpense,
                });
                if (res.error) alert(res.error); // M18
                if (!res.proceed) return;
                try {
                  await setStatus(it.id, value); // M20
                } catch (err) {
                  console.warn("Failed to set status:", err);
                  alert("Failed to update status.");
                }
              }}
            />
          )}

          {/* Basic */}
          <div className="edit-section-title">Basic Info</div>
          <label className="edit-label">Name</label>
          <input
            className="edit-input"
            value={draft.name}
            onChange={(e) => u("name", e.target.value)}
          />
          <div className="edit-row-2">
            <div>
              <label className="edit-label">Type</label>
              <select
                className="edit-input"
                value={draft.type}
                onChange={(e) => u("type", e.target.value)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div></div>
          </div>
          <label className="edit-label">Description</label>
          <textarea
            className="edit-textarea"
            value={draft.description}
            onChange={(e) => u("description", e.target.value)}
            rows={3}
          />

          {/* Stops */}
          <div className="edit-section-title">Stops</div>
          <div className="edit-stop-chips">
            {(stops || []).map((s) => {
              const selected = draft.stop_ids.includes(s.id);
              return (
                <button
                  key={s.id}
                  className={`stop-chip ${selected ? "stop-chip-active" : ""}`}
                  onClick={() =>
                    u(
                      "stop_ids",
                      selected
                        ? draft.stop_ids.filter((id) => id !== s.id)
                        : [...draft.stop_ids, s.id],
                    )
                  }
                >
                  {selected ? "✓ " : ""}
                  {s.name}
                </button>
              );
            })}
          </div>

          {/* Type-specific */}
          {draft.type === "food" && (
            <>
              <div className="edit-section-title">Food</div>
              <label className="edit-label">What to order</label>
              <input
                className="edit-input"
                value={draft.dish}
                onChange={(e) => u("dish", e.target.value)}
                placeholder="Signature dish"
              />
              <label className="edit-label">Category</label>
              <select
                className="edit-input"
                value={draft.subcat}
                onChange={(e) => u("subcat", e.target.value)}
              >
                {SUBCAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </>
          )}
          {draft.type === "stay" && (
            <>
              <div className="edit-section-title">Stay</div>
              <label className="edit-label">Tier</label>
              <select
                className="edit-input"
                value={draft.tier}
                onChange={(e) => u("tier", e.target.value)}
              >
                {TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <label className="edit-label">
                TripAdvisor link (for live prices)
              </label>
              <input
                className="edit-input"
                value={tripadvisorUrl}
                onChange={(e) => handleTripAdvisorUrl(e.target.value)}
                placeholder="Paste TripAdvisor hotel URL..."
              />
              {xoteloStatus === "searching" && (
                <div className="xotelo-status text-accent">
                  Searching for live prices...
                </div>
              )}
              {xoteloStatus === "found" && (
                <div className="xotelo-status text-green">
                  Live prices connected
                  {draft.xotelo_key && ` (${draft.xotelo_key})`}
                </div>
              )}
              {xoteloStatus === "not_found" && (
                <div className="xotelo-status text-muted">
                  No live prices found — enter estimate manually
                </div>
              )}
            </>
          )}
          {draft.type === "transport" && (
            <>
              <div className="edit-section-title">Transport</div>
              <div className="edit-row-2">
                <div>
                  <label className="edit-label">Mode</label>
                  <select
                    className="edit-input"
                    value={draft.transport_mode}
                    onChange={(e) => {
                      u("transport_mode", e.target.value);
                      u("is_rental", e.target.value === "rental");
                    }}
                  >
                    <option value="">Select...</option>
                    {TRANSPORT_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="edit-label">Rental</label>
                  <button
                    className={`fp ${draft.is_rental ? "fp-urgent-active" : "fp-urgent"}`}
                    disabled
                    style={{
                      width: "100%",
                      opacity: draft.transport_mode === "rental" ? 1 : 0.5,
                    }}
                  >
                    {draft.is_rental ? "Yes — booking" : "No — route"}
                  </button>
                </div>
              </div>
              <PlaceSearch
                label="Origin"
                value={draft.origin}
                onChange={(v) => u("origin", v)}
                stops={stops}
                placeholder="Airport, station, city..."
              />
              <PlaceSearch
                label="Destination"
                value={draft.dest}
                onChange={(v) => u("dest", v)}
                stops={stops}
                placeholder="Airport, station, city..."
              />
            </>
          )}
          {draft.type === "activity" && (
            <>
              <div className="edit-section-title">Activity</div>
              <label className="edit-label">Duration (hours)</label>
              <input
                className="edit-input"
                value={draft.hrs}
                onChange={(e) => u("hrs", e.target.value)}
                type="number"
                min="0"
                step="0.5"
                placeholder="2"
              />
            </>
          )}

          {/* Schedule */}
          <div className="edit-section-title">Schedule</div>
          <div className="edit-row-2">
            <div>
              <label className="edit-label">Start</label>
              <input
                className="edit-input"
                value={draft.start_time}
                onChange={(e) => u("start_time", e.target.value)}
                type="datetime-local"
              />
            </div>
            <div>
              <label className="edit-label">End</label>
              <input
                className="edit-input"
                value={draft.end_time}
                onChange={(e) => u("end_time", e.target.value)}
                type="datetime-local"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="edit-section-title">Pricing</div>
          <label className="edit-label">Estimated cost ($)</label>
          {isXoteloManaged(draft) ? (
            <>
              <input
                className="edit-input"
                value={draft.estimated_cost}
                type="number"
                readOnly
                disabled
              />
              <div
                className="edit-label"
                style={{ color: "var(--text-muted)", marginTop: 4 }}
              >
                Managed by live prices (Xotelo) — not editable here.
              </div>
            </>
          ) : (
            <input
              className="edit-input"
              value={draft.estimated_cost}
              onChange={(e) => u("estimated_cost", e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
            />
          )}
          <PricingBlock
            it={{
              ...it,
              estimated_cost: draft.estimated_cost
                ? Number(draft.estimated_cost)
                : it.estimated_cost,
            }}
            livePrice={livePrice}
            expenseAmount={expenseAmount}
            onExpenseClick={handleExpenseClick}
          />

          {/* Links */}
          <div className="edit-section-title">Links</div>
          <label className="edit-label">Link</label>
          <input
            className="edit-input"
            value={draft.link}
            onChange={(e) => u("link", e.target.value)}
            placeholder="https://..."
            type="url"
          />
          <label className="edit-label">Source</label>
          <input
            className="edit-input"
            value={draft.src}
            onChange={(e) => u("src", e.target.value)}
            placeholder="Where you found this"
          />
          <label className="edit-label">Reservation note</label>
          <input
            className="edit-input"
            value={draft.reserve_note}
            onChange={(e) => u("reserve_note", e.target.value)}
            placeholder="e.g. Book 2 weeks ahead"
          />

          {/* Notes */}
          <div className="edit-section-title">Notes</div>
          <textarea
            className="edit-textarea"
            value={draft.notes}
            onChange={(e) => u("notes", e.target.value)}
            rows={3}
            placeholder="Any notes..."
          />

          {/* Files */}
          <div className="edit-section-title">Attachments</div>
          {(itemFiles || []).length > 0 && (
            <div className="mb-3">
              <FileChipList files={itemFiles} onRemove={handleRemoveFile} />
            </div>
          )}
          <div className="detail-upload-row">
            <label className="detail-upload-btn">
              {uploading
                ? "Uploading..."
                : `Upload ${(itemFiles || []).length > 0 ? "another " : ""}file`}
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden-input"
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>
        {/* Sticky Save/Cancel at bottom */}
        <div className="detail-edit-actions">
          <button className="detail-btn flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="detail-btn sel flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <ConfirmModal
        state={confirmState}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

// ═══ SHARED PRICING BLOCK — used in both Summary and Edit modes ═══
function PricingBlock({ it, livePrice, expenseAmount, onExpenseClick }) {
  return (
    <div className="detail-section mt-5">
      <div className="detail-section-title">Pricing</div>
      <div className="detail-price-display">
        {Number(it.estimated_cost) > 0 ? (
          <div className="detail-est-price">
            <span>
              Estimated total: <strong>{$f(it.estimated_cost)}</strong>
            </span>
            {it.xotelo_key && (
              <span className="text-xs text-accent" style={{ marginLeft: 6 }}>
                via Xotelo
              </span>
            )}
          </div>
        ) : it.xotelo_key ? (
          <div className="text-sm text-accent">
            Xotelo connected — price updating...
          </div>
        ) : (
          <div className="text-sm text-muted">No estimated price</div>
        )}
        {livePrice > 0 && it.type === "stay" && (
          <div className="detail-live-price mt-1">
            <span className="detail-live-label">Live price</span>
            <span className="detail-live-value">{$f(livePrice)}/night</span>
          </div>
        )}
      </div>
      <div onClick={onExpenseClick} className="expense-tap-row">
        {expenseAmount > 0 ? (
          <div className="flex-between">
            <span className="text-sm text-muted">Confirmed cost</span>
            <span
              style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}
            >
              {$f(expenseAmount)}
            </span>
          </div>
        ) : (
          <div
            className="text-sm text-accent"
            style={{ fontWeight: 600, textAlign: "center" }}
          >
            + Add confirmed cost
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ PHOTO CAROUSEL — scroll-snap + arrow buttons for desktop ═══
function PhotoCarousel({ photos, name }) {
  const trackRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  // L32: track failed image loads to hide the carousel if all fail.
  const [failed, setFailed] = useState(0);

  const scroll = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollBy({ left: dir === "next" ? w : -w, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handleScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIdx(idx);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // After hooks (rules-of-hooks): if every photo 404'd, render nothing.
  if (photos.length > 0 && failed >= photos.length) return null;

  return (
    <div className="detail-carousel">
      <div ref={trackRef} className="detail-carousel-track">
        {photos.map((url, i) => (
          <div key={i} className="detail-carousel-slide">
            <img
              src={url}
              alt={`${name} ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              onError={(e) => {
                e.target.style.display = "none";
                setFailed((n) => n + 1);
              }}
            />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={() => scroll("prev")}
            aria-label="Previous photo"
            disabled={activeIdx === 0}
          >
            ‹
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={() => scroll("next")}
            aria-label="Next photo"
            disabled={activeIdx >= photos.length - 1}
          >
            ›
          </button>
          <div className="detail-carousel-dots">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`carousel-dot ${i === activeIdx ? "active" : ""}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
