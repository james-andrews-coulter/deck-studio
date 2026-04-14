import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { useAppStore } from '@/store';
import type { Deck } from '@/lib/types';

const sampleDeck: Omit<Deck, 'id' | 'importedAt'> = {
  name: 'D1',
  fieldMapping: { title: 't' },
  cards: [
    { id: 'c1', fields: { t: 'A' } },
    { id: 'c2', fields: { t: 'B' } },
    { id: 'c3', fields: { t: 'C' } },
  ],
};

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('store', () => {
  beforeEach(() => {
    reset();
  });

  it('adds and lists a deck', () => {
    const id = useAppStore.getState().addDeck(sampleDeck);
    const deck = useAppStore.getState().decks[id];
    expect(deck.name).toBe('D1');
    expect(deck.id).toBe(id);
  });

  it('creates a list with one CardRef per deck card, ungrouped, visible', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'My List');
    const list = useAppStore.getState().lists[listId];
    expect(list.cardRefs).toHaveLength(3);
    expect(list.cardRefs.every((r) => r.hidden === false && r.groupId === null)).toBe(true);
    expect(list.cardRefs.map((r) => r.cardId)).toEqual(['c1', 'c2', 'c3']);
    expect(list.groups).toEqual([]);
  });

  it('reorders cardRefs within a list', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().reorderCards(listId, 0, 2);
    const ids = useAppStore.getState().lists[listId].cardRefs.map((r) => r.cardId);
    expect(ids).toEqual(['c2', 'c3', 'c1']);
  });

  it('toggles hidden flag', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setHidden(listId, 'c1', true);
    expect(useAppStore.getState().lists[listId].cardRefs[0].hidden).toBe(true);
  });

  it('adds, renames, and deletes groups', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    const gId = useAppStore.getState().addGroup(listId, 'Warmups');
    useAppStore.getState().renameGroup(listId, gId, 'Starters');
    let list = useAppStore.getState().lists[listId];
    expect(list.groups[0]).toMatchObject({ name: 'Starters' });
    useAppStore.getState().moveCardToGroup(listId, 'c1', gId);
    expect(useAppStore.getState().lists[listId].cardRefs[0].groupId).toBe(gId);
    useAppStore.getState().deleteGroup(listId, gId);
    list = useAppStore.getState().lists[listId];
    expect(list.groups).toHaveLength(0);
    expect(list.cardRefs[0].groupId).toBe(null);
  });

  it('shuffles cardRefs (still same length and same ids)', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().shuffleList(listId);
    const ids = useAppStore.getState().lists[listId].cardRefs.map((r) => r.cardId);
    expect(ids.sort()).toEqual(['c1', 'c2', 'c3']);
  });

  it('deleteDeck does NOT cascade-delete lists', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().deleteDeck(deckId);
    expect(useAppStore.getState().decks[deckId]).toBeUndefined();
    expect(useAppStore.getState().lists[listId]).toBeDefined();
  });
});
