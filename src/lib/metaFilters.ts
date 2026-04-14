import type { Card, Deck } from './types';

/**
 * Distinct values per meta field across a deck's cards.
 * Array fields (e.g. tags) are flattened. Values are coerced to strings.
 */
export function getMetaFilterOptions(deck: Deck): Record<string, string[]> {
  const meta = deck.fieldMapping.meta ?? [];
  const out: Record<string, string[]> = {};
  for (const key of meta) {
    const seen = new Set<string>();
    for (const card of deck.cards) {
      const v = card.fields[key];
      if (v == null) continue;
      if (Array.isArray(v)) {
        for (const item of v) if (item != null) seen.add(String(item));
      } else {
        seen.add(String(v));
      }
    }
    out[key] = Array.from(seen).sort();
  }
  return out;
}

/**
 * Does a card match the given per-key filter set? A card matches a key if its
 * value (flattened for arrays) intersects the selected set. Empty sets
 * (no selections for a key) are treated as "no filter on this key".
 */
export function cardMatchesFilters(
  card: Card,
  filters: Record<string, Set<string>>,
): boolean {
  for (const [key, selected] of Object.entries(filters)) {
    if (selected.size === 0) continue;
    const v = card.fields[key];
    if (v == null) return false;
    const values = Array.isArray(v) ? v.map((x) => String(x)) : [String(v)];
    if (!values.some((val) => selected.has(val))) return false;
  }
  return true;
}
