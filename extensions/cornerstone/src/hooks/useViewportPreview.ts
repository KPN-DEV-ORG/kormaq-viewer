import { useCallback, useEffect, useRef } from 'react';
import { useViewportPreviewStore } from '../stores/useViewportPreviewStore';

/** Preview display settings temporarily; only a click commits the change. */
export function useViewportPreview<T>(
  contextKey: string,
  value: T | undefined,
  applyValue: (value: T) => void
) {
  const showPreview = useViewportPreviewStore(state => state.enabled);
  const setEnabled = useViewportPreviewStore(state => state.setEnabled);
  const baseline = useRef<{ value: T; restore: () => void }>();
  const currentValue = useRef(value);

  if (!baseline.current) {
    currentValue.current = value;
  }

  const restorePreview = useCallback(() => {
    const previous = baseline.current;
    baseline.current = undefined;
    if (previous) {
      currentValue.current = previous.value;
      previous.restore();
    }
  }, []);

  // Restore the original viewport/series even when its menu is dismissed mid-hover.
  useEffect(() => {
    currentValue.current = value;
    return () => restorePreview();
  }, [contextKey, restorePreview]);
  useEffect(() => {
    if (!showPreview) {
      restorePreview();
    }
  }, [showPreview, restorePreview]);

  return {
    showPreview,
    setShowPreview: (enabled: boolean) => {
      if (!enabled) {
        restorePreview();
      }
      setEnabled(enabled);
    },
    preview: (nextValue: T) => {
      if (!showPreview || currentValue.current === undefined) {
        return;
      }
      if (!baseline.current) {
        const previous = currentValue.current;
        baseline.current = { value: previous, restore: () => applyValue(previous) };
      }
      applyValue(nextValue);
    },
    commit: (nextValue: T) => {
      baseline.current = undefined;
      currentValue.current = nextValue;
      applyValue(nextValue);
    },
    restorePreview,
  };
}
