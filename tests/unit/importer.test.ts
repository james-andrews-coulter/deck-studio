import { describe, it, expect } from 'vitest';
import { parseDeck, ImportError } from '@/lib/importer';

describe('parseDeck', () => {
  it('accepts a plain array and uses filename for name', () => {
    const out = parseDeck(JSON.stringify([{ prompt: 'a' }, { prompt: 'b' }]), 'party-cards.json');
    expect(out.name).toBe('party-cards');
    expect(out.cards).toHaveLength(2);
    expect(out.cards[0].fields.prompt).toBe('a');
  });

  it('accepts { name, cards }', () => {
    const src = JSON.stringify({ name: 'My Deck', cards: [{ t: 1 }] });
    const out = parseDeck(src, 'ignored.json');
    expect(out.name).toBe('My Deck');
    expect(out.cards).toHaveLength(1);
  });

  it('accepts pre-configured fieldMapping when title resolves', () => {
    const src = JSON.stringify({
      name: 'P',
      fieldMapping: { title: 'prompt' },
      cards: [{ prompt: 'x' }],
    });
    const out = parseDeck(src, 'p.json');
    expect(out.fieldMapping).toEqual({ title: 'prompt' });
    expect(out.skippedMapping).toBe(true);
  });

  it('falls back to mapping UI when fieldMapping.title does not resolve', () => {
    const src = JSON.stringify({
      name: 'P',
      fieldMapping: { title: 'not_a_key' },
      cards: [{ prompt: 'x' }],
    });
    const out = parseDeck(src, 'p.json');
    expect(out.skippedMapping).toBe(false);
    expect(out.warnings).toContain('preconfigured_title_unresolved');
  });

  it('assigns uuids when cards have no id', () => {
    const out = parseDeck(JSON.stringify([{ x: 1 }, { x: 2 }]), 'd.json');
    expect(out.cards[0].id).toMatch(/[-0-9a-f]+/);
    expect(out.cards[0].id).not.toBe(out.cards[1].id);
  });

  it('preserves supplied card ids and dedupes duplicates (keep first)', () => {
    const src = JSON.stringify([
      { id: '1', x: 'first' },
      { id: '2', x: 'two' },
      { id: '1', x: 'duplicate' },
    ]);
    const out = parseDeck(src, 'd.json');
    expect(out.cards).toHaveLength(2);
    expect(out.cards[0].fields.x).toBe('first');
    expect(out.warnings).toContain('duplicate_ids');
  });

  it('detects schema as union of keys', () => {
    const out = parseDeck(JSON.stringify([{ a: 1 }, { b: 2, c: 3 }]), 'd.json');
    expect(out.detectedKeys.sort()).toEqual(['a', 'b', 'c']);
  });

  it('throws ImportError for invalid JSON', () => {
    expect(() => parseDeck('not json', 'x.json')).toThrow(ImportError);
  });

  it('throws ImportError for empty cards', () => {
    expect(() => parseDeck('[]', 'x.json')).toThrow(/No cards/);
    expect(() => parseDeck('{"cards":[]}', 'x.json')).toThrow(/No cards/);
  });

  it('throws ImportError for non-object cards', () => {
    expect(() => parseDeck('[1, 2, 3]', 'x.json')).toThrow(/objects/);
  });

  it('throws ImportError for unrecognized top-level shape', () => {
    expect(() => parseDeck('"just a string"', 'x.json')).toThrow(/expected/i);
  });
});
