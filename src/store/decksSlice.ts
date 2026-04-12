import type { StateCreator } from 'zustand';
import type { Deck, FieldMapping } from '@/lib/types';
import { uuid } from '@/lib/uuid';

export type DecksSlice = {
  decks: Record<string, Deck>;
  addDeck: (input: Omit<Deck, 'id' | 'importedAt'>) => string;
  updateDeckMapping: (deckId: string, mapping: FieldMapping) => void;
  renameDeck: (deckId: string, name: string) => void;
  deleteDeck: (deckId: string) => void;
};

export const createDecksSlice: StateCreator<DecksSlice, [], [], DecksSlice> = (set) => ({
  decks: {},
  addDeck: (input) => {
    const id = uuid();
    const deck: Deck = { ...input, id, importedAt: new Date().toISOString() };
    set((s) => ({ decks: { ...s.decks, [id]: deck } }));
    return id;
  },
  updateDeckMapping: (deckId, mapping) =>
    set((s) => ({
      decks: {
        ...s.decks,
        [deckId]: { ...s.decks[deckId], fieldMapping: mapping },
      },
    })),
  renameDeck: (deckId, name) =>
    set((s) => ({ decks: { ...s.decks, [deckId]: { ...s.decks[deckId], name } } })),
  deleteDeck: (deckId) =>
    set((s) => {
      const rest = { ...s.decks };
      delete rest[deckId];
      return { decks: rest };
    }),
});
