import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store';

const exerciseFixture = {
  id: 'priority',
  name: 'Priority Planner',
  instructions: '',
  groups: ['This Week', 'This Month', 'This Year'],
};

function seedDeck(withExercise: boolean) {
  return useAppStore.getState().addDeck({
    name: 'D',
    fieldMapping: { title: 't' },
    cards: [
      { id: 'c1', fields: { t: 'a' } },
      { id: 'c2', fields: { t: 'b' } },
    ],
    ...(withExercise ? { exercises: [exerciseFixture] } : {}),
  });
}

describe('createList', () => {
  beforeEach(() => {
    useAppStore.setState({ decks: {}, lists: {} });
  });

  it('creates a list without an exerciseId (existing behavior)', () => {
    const deckId = seedDeck(false);
    const listId = useAppStore.getState().createList(deckId, 'L');
    const list = useAppStore.getState().lists[listId];
    expect(list.groups).toEqual([]);
    expect(list.exerciseId).toBeUndefined();
    expect(list.cardRefs).toHaveLength(2);
  });

  it('treats empty-string exerciseId as "none"', () => {
    const deckId = seedDeck(true);
    const listId = useAppStore.getState().createList(deckId, 'L', '');
    const list = useAppStore.getState().lists[listId];
    expect(list.groups).toEqual([]);
    expect(list.exerciseId).toBeUndefined();
  });

  it('seeds groups from the exercise template in order', () => {
    const deckId = seedDeck(true);
    const listId = useAppStore.getState().createList(deckId, 'L', 'priority');
    const list = useAppStore.getState().lists[listId];
    expect(list.exerciseId).toBe('priority');
    expect(list.groups).toHaveLength(3);
    expect(list.groups.map((g) => g.name)).toEqual(['This Week', 'This Month', 'This Year']);
    for (const g of list.groups) {
      expect(g.color).toBe('slate');
      expect(g.id).toBeTruthy();
    }
  });

  it('gives each seeded group a unique id', () => {
    const deckId = seedDeck(true);
    const listId = useAppStore.getState().createList(deckId, 'L', 'priority');
    const ids = useAppStore.getState().lists[listId].groups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cardRefs remain ungrouped after seeding', () => {
    const deckId = seedDeck(true);
    const listId = useAppStore.getState().createList(deckId, 'L', 'priority');
    const list = useAppStore.getState().lists[listId];
    for (const r of list.cardRefs) expect(r.groupId).toBe(null);
  });

  it('throws when exerciseId does not resolve on the deck', () => {
    const deckId = seedDeck(true);
    expect(() =>
      useAppStore.getState().createList(deckId, 'L', 'nope'),
    ).toThrow(/exercise/i);
  });

  it('duplicate preserves exerciseId', () => {
    const deckId = seedDeck(true);
    const listId = useAppStore.getState().createList(deckId, 'L', 'priority');
    const dupId = useAppStore.getState().duplicateList(listId);
    expect(useAppStore.getState().lists[dupId].exerciseId).toBe('priority');
  });
});
