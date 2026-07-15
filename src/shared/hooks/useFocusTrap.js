import { useEffect, useRef } from 'react';

export function useFocusTrap(active = true) {
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    triggerRef.current = document.activeElement;
    const el = ref.current;
    if (!el) return;

    const focusable = () => el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const items = focusable();
    if (items.length) items[0].focus();

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      const f = focusable();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [active]);

  return ref;
}
