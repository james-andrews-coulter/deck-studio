import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import { createDecksSlice, type DecksSlice } from './decksSlice';
import { createListsSlice, type ListsSlice } from './listsSlice';
import { createUiSlice, type UISlice } from './uiSlice';
import { idbStorage } from './persistence';
import { CURRENT_VERSION, migrate } from './migrations';

export type AppState = DecksSlice & ListsSlice & UISlice;

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createDecksSlice(...a),
      ...createListsSlice(...a),
      ...createUiSlice(...a),
    }),
    {
      name: 'deck-studio:state',
      version: CURRENT_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ decks: s.decks, lists: s.lists }),
      migrate: (state, version) => migrate(state, version) as AppState,
      onRehydrateStorage: () => (_state, err) => {
        if (err) {
          queueMicrotask(() => {
            toast.error("Couldn't load saved data. Your work is safe but not restored.");
          });
        }
      },
    }
  )
);
