import { useCallback, useState } from 'react';

/**
 * Local UI state for the list-view Select mode: a flag that toggles
 * the checkbox rail on each row, and a Set of selected card IDs used
 * by the floating action bar (Move to…, New group from N, Clear).
 *
 * Exiting Select mode clears the selection by design.
 */
export function useListSelection() {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((cardId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectAll = useCallback(
    (cardIds: readonly string[]) => setSelected(new Set(cardIds)),
    [],
  );

  const toggleSelectMode = useCallback(() => {
    setSelectMode((on) => {
      if (on) setSelected(new Set());
      return !on;
    });
  }, []);

  return {
    selectMode,
    selected,
    toggleSelect,
    clearSelection,
    selectAll,
    toggleSelectMode,
  };
}
