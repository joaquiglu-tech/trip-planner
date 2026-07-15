import { useState, useCallback, useRef, useEffect } from "react";

export function useConfirm() {
  const [state, setState] = useState(null);
  const stateRef = useRef(null);
  useEffect(() => {
    stateRef.current = state;
  });
  // L04: if a confirm is still pending when a new one opens, or on unmount,
  // settle the old promise (false) so its awaiting caller never hangs.
  useEffect(() => () => stateRef.current?.resolve(false), []);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      stateRef.current?.resolve(false);
      setState({
        message,
        destructive: opts.destructive || false,
        confirmLabel: opts.confirmLabel || "Confirm",
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  return { confirm, confirmState: state, handleConfirm, handleCancel };
}
