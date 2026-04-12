import { describe, it, expect } from 'vitest';
import { resolveCard } from '@/lib/cardFields';
import type { Card, FieldMapping } from '@/lib/types';

const mk = (fields: Record<string, unknown>): Card => ({ id: 'c1', fields });

describe('resolveCard', () => {
  it('maps title from the configured key', () => {
    const mapping: FieldMapping = { title: 'prompt' };
    expect(resolveCard(mk({ prompt: 'Hello' }), mapping).title).toBe('Hello');
  });

  it('falls back to empty string when title key is missing on card', () => {
    const mapping: FieldMapping = { title: 'prompt' };
    expect(resolveCard(mk({ other: 'x' }), mapping).title).toBe('');
  });

  it('maps subtitle/body/image when provided', () => {
    const mapping: FieldMapping = { title: 't', subtitle: 's', body: 'b', image: 'img' };
    const out = resolveCard(mk({ t: 'T', s: 'S', b: 'B', img: 'u.png' }), mapping);
    expect(out).toMatchObject({ title: 'T', subtitle: 'S', body: 'B', image: 'u.png' });
  });

  it('stringifies non-string values for display', () => {
    const mapping: FieldMapping = { title: 't', body: 'b' };
    const out = resolveCard(mk({ t: 42, b: true }), mapping);
    expect(out.title).toBe('42');
    expect(out.body).toBe('true');
  });

  it('serializes meta entries as key/value pairs', () => {
    const mapping: FieldMapping = { title: 't', meta: ['tags', 'difficulty'] };
    const out = resolveCard(mk({ t: 'T', tags: ['a', 'b'], difficulty: 3 }), mapping);
    expect(out.meta).toEqual([
      { key: 'tags', value: 'a, b' },
      { key: 'difficulty', value: '3' },
    ]);
  });

  it('omits unmapped optional roles', () => {
    const mapping: FieldMapping = { title: 't' };
    const out = resolveCard(mk({ t: 'T', x: 'Y' }), mapping);
    expect(out.subtitle).toBeUndefined();
    expect(out.body).toBeUndefined();
    expect(out.image).toBeUndefined();
    expect(out.meta).toEqual([]);
  });
});
