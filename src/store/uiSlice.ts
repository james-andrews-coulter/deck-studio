import type { StateCreator } from 'zustand';

export type UISlice = {
  ui: {
    hiddenSheetOpen: boolean;
    activeDeckDetail: string | null;
    exerciseSheetOpenByListId: Record<string, boolean>;
    navDrawerOpen: boolean;
  };
  setHiddenSheetOpen: (open: boolean) => void;
  setDeckDetail: (id: string | null) => void;
  setExerciseSheetOpen: (listId: string, open: boolean) => void;
  setNavDrawerOpen: (open: boolean) => void;
};

export const createUiSlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  ui: {
    hiddenSheetOpen: false,
    activeDeckDetail: null,
    exerciseSheetOpenByListId: {},
    navDrawerOpen: false,
  },
  setHiddenSheetOpen: (open) => set((s) => ({ ui: { ...s.ui, hiddenSheetOpen: open } })),
  setDeckDetail: (id) => set((s) => ({ ui: { ...s.ui, activeDeckDetail: id } })),
  setExerciseSheetOpen: (listId, open) =>
    set((s) => ({
      ui: {
        ...s.ui,
        exerciseSheetOpenByListId: { ...s.ui.exerciseSheetOpenByListId, [listId]: open },
      },
    })),
  setNavDrawerOpen: (open) =>
    set((s) => ({ ui: { ...s.ui, navDrawerOpen: open } })),
});
