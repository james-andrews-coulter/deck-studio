import { describe, it, expect } from 'vitest';
import { cardMatchesFilters, getMetaFilterOptions } from '@/lib/metaFilters';
import type { Card, Deck } from '@/lib/types';

const deck: Deck = {
  id: 'd',
  name: 'D',
  importedAt: '2026-04-14T00:00:00Z',
  fieldMapping: { title: 't', meta: ['difficulty', 'tags'] },
  cards: [
    { id: 'c1', fields: { t: 'A', difficulty: 'easy', tags: ['warmup', 'solo'] } },
    { id: 'c2', fields: { t: 'B', difficulty: 'hard', tags: ['craft'] } },
    { id: 'c3', fields: { t: 'C', difficulty: 'easy', tags: [] } },
    { id: 'c4', fields: { t: 'D' } },
  ],
};

describe('getMetaFilterOptions', () => {
  it('returns distinct sorted string values per meta key', () => {
    const opts = getMetaFilterOptions(deck);
    expect(opts.difficulty).toEqual(['easy', 'hard']);
    expect(opts.tags).toEqual(['craft', 'solo', 'warmup']);
  });

  it('returns empty object when the deck has no meta mapping', () => {
    const d: Deck = { ...deck, fieldMapping: { title: 't' } };
    expect(getMetaFilterOptions(d)).toEqual({});
  });
});

describe('cardMatchesFilters', () => {
  const card: Card = deck.cards[0]; // easy, [warmup, solo]

  it('matches when no filters are active', () => {
    expect(cardMatchesFilters(card, {})).toBe(true);
    expect(cardMatchesFilters(card, { difficulty: new Set() })).toBe(true);
  });

  it('matches when a filter includes one of the card values', () => {
    expect(cardMatchesFilters(card, { difficulty: new Set(['easy']) })).toBe(true);
    expect(cardMatchesFilters(card, { tags: new Set(['solo']) })).toBe(true);
  });

  it('rejects when a filter excludes all card values', () => {
    expect(cardMatchesFilters(card, { difficulty: new Set(['hard']) })).toBe(false);
    expect(cardMatchesFilters(card, { tags: new Set(['craft']) })).toBe(false);
  });

  it('ANDs multiple filter keys (must match each)', () => {
    expect(
      cardMatchesFilters(card, {
        difficulty: new Set(['easy']),
        tags: new Set(['solo']),
      }),
    ).toBe(true);
    expect(
      cardMatchesFilters(card, {
        difficulty: new Set(['easy']),
        tags: new Set(['craft']),
      }),
    ).toBe(false);
  });

  it('rejects when card is missing the filtered field', () => {
    const c: Card = deck.cards[3]; // no difficulty, no tags
    expect(cardMatchesFilters(c, { difficulty: new Set(['easy']) })).toBe(false);
  });
});
