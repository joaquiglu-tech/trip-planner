import { useState, useRef, useCallback } from 'react';

export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg, opts = {}) => {
    setToast({ message: msg, action: opts.action || null, onAction: opts.onAction || null });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), opts.duration || duration);
  }, [duration]);

  return { toast, showToast };
}
