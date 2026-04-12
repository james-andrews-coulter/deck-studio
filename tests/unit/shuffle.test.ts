import { describe, it, expect } from 'vitest';
import { shuffle } from '@/lib/shuffle';

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    expect(shuffle([1, 2, 3, 4, 5])).toHaveLength(5);
  });

  it('contains exactly the same elements (permutation)', () => {
    const input = ['a', 'b', 'c', 'd'];
    const out = shuffle(input).sort();
    expect(out).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it('produces varied orderings across 1000 runs (sanity)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      results.add(shuffle([1, 2, 3, 4, 5]).join(','));
    }
    expect(results.size).toBeGreaterThan(10);
  });

  it('returns empty array for empty input', () => {
    expect(shuffle([])).toEqual([]);
  });
});
