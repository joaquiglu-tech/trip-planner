import { useState, useCallback } from 'react';

export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setState({ message, destructive: opts.destructive || false, confirmLabel: opts.confirmLabel || 'Confirm', resolve });
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
