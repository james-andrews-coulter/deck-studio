import type { StateCreator } from 'zustand';

export type UISlice = {
  ui: {
    collapsedGroups: Record<string, boolean>;       // keyed by groupId
    hiddenSheetOpen: boolean;
    drawCardOpen: boolean;
    activeDeckDetail: string | null;
  };
  toggleGroupCollapsed: (groupId: string) => void;
  setHiddenSheetOpen: (open: boolean) => void;
  setDrawCardOpen: (open: boolean) => void;
  setDeckDetail: (id: string | null) => void;
};

export const createUiSlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  ui: {
    collapsedGroups: {},
    hiddenSheetOpen: false,
    drawCardOpen: false,
    activeDeckDetail: null,
  },
  toggleGroupCollapsed: (groupId) =>
    set((s) => ({
      ui: {
        ...s.ui,
        collapsedGroups: { ...s.ui.collapsedGroups, [groupId]: !s.ui.collapsedGroups[groupId] },
      },
    })),
  setHiddenSheetOpen: (open) => set((s) => ({ ui: { ...s.ui, hiddenSheetOpen: open } })),
  setDrawCardOpen: (open) => set((s) => ({ ui: { ...s.ui, drawCardOpen: open } })),
  setDeckDetail: (id) => set((s) => ({ ui: { ...s.ui, activeDeckDetail: id } })),
});
