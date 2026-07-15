export default function ConfirmModal({ state, onConfirm, onCancel }) {
  if (!state) return null;
  return (
    <div className="detail-overlay" onClick={onCancel} role="alertdialog" aria-modal="true" aria-label="Confirmation">
      <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{state.message}</p>
        <div className="confirm-actions">
          <button className="detail-btn" onClick={onCancel}>Cancel</button>
          <button className={`detail-btn ${state.destructive ? 'detail-btn-delete' : 'sel'}`} onClick={onConfirm}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
