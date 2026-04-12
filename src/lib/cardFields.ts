import type { Card, FieldMapping, ResolvedCard } from './types';

const toDisplayString = (v: unknown): string => {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(toDisplayString).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export function resolveCard(card: Card, mapping: FieldMapping): ResolvedCard {
  const get = (key?: string): string | undefined =>
    key ? toDisplayString(card.fields[key]) : undefined;

  return {
    id: card.id,
    title: get(mapping.title) ?? '',
    subtitle: mapping.subtitle ? get(mapping.subtitle) || undefined : undefined,
    body: mapping.body ? get(mapping.body) || undefined : undefined,
    image: mapping.image ? get(mapping.image) || undefined : undefined,
    meta: (mapping.meta ?? [])
      .filter((k) => card.fields[k] !== undefined)
      .map((k) => ({ key: k, value: toDisplayString(card.fields[k]) })),
  };
}
