export default function Toast({ message }) {
  if (!message) return null;
  const text = typeof message === 'string' ? message : message.message;
  const action = typeof message === 'object' ? message.action : null;
  const onAction = typeof message === 'object' ? message.onAction : null;
  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className="toast">
        <span>{text}</span>
        {action && (
          <button className="toast-action" onClick={() => onAction?.()}>
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
