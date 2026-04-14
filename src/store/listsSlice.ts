import type { StateCreator } from 'zustand';
import type { CardRef, Group, List } from '@/lib/types';
import { uuid } from '@/lib/uuid';
import { shuffle } from '@/lib/shuffle';

export type ListsSlice = {
  lists: Record<string, List>;
  createList: (deckId: string, name: string, exerciseId?: string) => string;
  renameList: (listId: string, name: string) => void;
  duplicateList: (listId: string) => string;
  deleteList: (listId: string) => void;

  reorderCards: (listId: string, fromIndex: number, toIndex: number) => void;
  setHidden: (listId: string, cardId: string, hidden: boolean) => void;
  restoreAllHidden: (listId: string) => void;

  addGroup: (listId: string, name: string) => string;
  renameGroup: (listId: string, groupId: string, name: string) => void;
  deleteGroup: (listId: string, groupId: string) => void;
  reorderGroups: (listId: string, fromIndex: number, toIndex: number) => void;
  clearAllGroups: (listId: string) => void;

  moveCardToGroup: (listId: string, cardId: string, groupId: string | null) => void;
  moveCardToGroupAt: (
    listId: string,
    cardId: string,
    targetGroupId: string | null,
    insertIndexInGroup: number
  ) => void;

  shuffleList: (listId: string) => void;
  setCardRefs: (listId: string, cardRefs: CardRef[]) => void;
};

const touch = (list: List): List => ({ ...list, updatedAt: new Date().toISOString() });

const withList =
  (listId: string, updater: (list: List) => List) =>
  (s: { lists: Record<string, List> }) => {
    const list = s.lists[listId];
    if (!list) return s;
    return { ...s, lists: { ...s.lists, [listId]: touch(updater(list)) } };
  };

export const createListsSlice: StateCreator<
  ListsSlice & { decks: Record<string, import('@/lib/types').Deck> },
  [],
  [],
  ListsSlice
> = (set, get) => ({
  lists: {},

  createList: (deckId, name, exerciseId) => {
    const deck = get().decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} not found`);
    const id = uuid();
    const now = new Date().toISOString();
    let seededGroups: Group[] = [];
    let boundExerciseId: string | undefined;
    if (exerciseId) {
      const ex = deck.exercises?.find((e) => e.id === exerciseId);
      if (!ex) throw new Error(`Exercise ${exerciseId} not found on deck ${deckId}`);
      seededGroups = ex.groups.map((label) => ({ id: uuid(), name: label }));
      boundExerciseId = ex.id;
    }
    const list: List = {
      id,
      name,
      deckId,
      createdAt: now,
      updatedAt: now,
      groups: seededGroups,
      cardRefs: deck.cards.map((c) => ({ cardId: c.id, hidden: false, groupId: null })),
      ...(boundExerciseId ? { exerciseId: boundExerciseId } : {}),
    };
    set((s) => ({ lists: { ...s.lists, [id]: list } }));
    return id;
  },

  renameList: (listId, name) => set(withList(listId, (l) => ({ ...l, name }))),

  duplicateList: (listId) => {
    const src = get().lists[listId];
    if (!src) return listId;
    const newId = uuid();
    const now = new Date().toISOString();
    const copy: List = {
      ...src,
      id: newId,
      name: `${src.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ lists: { ...s.lists, [newId]: copy } }));
    return newId;
  },

  deleteList: (listId) =>
    set((s) => {
      const rest = { ...s.lists };
      delete rest[listId];
      return { lists: rest };
    }),

  reorderCards: (listId, fromIndex, toIndex) =>
    set(
      withList(listId, (l) => {
        if (fromIndex === toIndex) return l;
        const next = l.cardRefs.slice();
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return { ...l, cardRefs: next };
      })
    ),

  setHidden: (listId, cardId, hidden) =>
    set(
      withList(listId, (l) => ({
        ...l,
        cardRefs: l.cardRefs.map((r) => (r.cardId === cardId ? { ...r, hidden } : r)),
      }))
    ),

  restoreAllHidden: (listId) =>
    set(withList(listId, (l) => ({
      ...l,
      cardRefs: l.cardRefs.map((r) => ({ ...r, hidden: false })),
    }))),

  addGroup: (listId, name) => {
    const id = uuid();
    const group: Group = { id, name };
    set(withList(listId, (l) => ({ ...l, groups: [...l.groups, group] })));
    return id;
  },

  renameGroup: (listId, groupId, name) =>
    set(withList(listId, (l) => ({
      ...l,
      groups: l.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
    }))),

  deleteGroup: (listId, groupId) =>
    set(withList(listId, (l) => ({
      ...l,
      groups: l.groups.filter((g) => g.id !== groupId),
      cardRefs: l.cardRefs.map((r) => (r.groupId === groupId ? { ...r, groupId: null } : r)),
    }))),

  reorderGroups: (listId, fromIndex, toIndex) =>
    set(withList(listId, (l) => {
      if (fromIndex === toIndex) return l;
      const next = l.groups.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...l, groups: next };
    })),

  clearAllGroups: (listId) =>
    set(withList(listId, (l) => ({
      ...l,
      groups: [],
      cardRefs: l.cardRefs.map((r) => ({ ...r, groupId: null })),
    }))),

  moveCardToGroup: (listId, cardId, groupId) =>
    set(withList(listId, (l) => ({
      ...l,
      cardRefs: l.cardRefs.map((r) => (r.cardId === cardId ? { ...r, groupId } : r)),
    }))),

  moveCardToGroupAt: (listId, cardId, targetGroupId, insertIndexInGroup) =>
    set(withList(listId, (l) => {
      const without = l.cardRefs.filter((r) => r.cardId !== cardId);
      const original = l.cardRefs.find((r) => r.cardId === cardId);
      if (!original) return l;
      const updated: CardRef = { ...original, groupId: targetGroupId };
      const groupRefs = without
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.groupId === targetGroupId);
      const targetGlobalIndex =
        insertIndexInGroup >= groupRefs.length
          ? without.length
          : groupRefs[insertIndexInGroup].i;
      const next = without.slice();
      next.splice(targetGlobalIndex, 0, updated);
      return { ...l, cardRefs: next };
    })),

  shuffleList: (listId) =>
    set(withList(listId, (l) => ({ ...l, cardRefs: shuffle(l.cardRefs) }))),

  setCardRefs: (listId, cardRefs) =>
    set(withList(listId, (l) => ({ ...l, cardRefs }))),
});
