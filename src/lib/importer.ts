import { uuid } from './uuid';
import type { Card, FieldMapping } from './types';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export type ParsedDeck = {
  name: string;
  cards: Card[];
  fieldMapping: FieldMapping;
  detectedKeys: string[];
  skippedMapping: boolean;
  warnings: string[];
};

const stripExt = (filename: string) => filename.replace(/\.json$/i, '');

export function parseDeck(raw: string, filename: string): ParsedDeck {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ImportError("Couldn't parse file. Not valid JSON.");
  }

  let name = stripExt(filename);
  let rawCards: unknown;
  let suppliedMapping: Partial<FieldMapping> | undefined;

  if (Array.isArray(data)) {
    rawCards = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj.cards)) {
      throw new ImportError(
        "File doesn't look like a deck. Expected an array of cards or { name, cards: [...] }."
      );
    }
    rawCards = obj.cards;
    if (typeof obj.name === 'string' && obj.name.trim()) name = obj.name.trim();
    if (obj.fieldMapping && typeof obj.fieldMapping === 'object') {
      suppliedMapping = obj.fieldMapping as Partial<FieldMapping>;
    }
  } else {
    throw new ImportError(
      "File doesn't look like a deck. Expected an array of cards or { name, cards: [...] }."
    );
  }

  const cardsArr = rawCards as unknown[];
  if (!cardsArr.length) throw new ImportError('No cards found in this file.');
  if (cardsArr.some((c) => !c || typeof c !== 'object' || Array.isArray(c))) {
    throw new ImportError('Cards must be objects with fields.');
  }

  const seenIds = new Set<string>();
  const warnings: string[] = [];
  const cards: Card[] = [];

  for (const entry of cardsArr as Record<string, unknown>[]) {
    const suppliedId = typeof entry.id === 'string' ? entry.id : undefined;
    if (suppliedId && seenIds.has(suppliedId)) {
      if (!warnings.includes('duplicate_ids')) warnings.push('duplicate_ids');
      continue;
    }
    const id = suppliedId ?? uuid();
    seenIds.add(id);
    const { id: _omit, ...fields } = entry;
    cards.push({ id, fields });
  }

  const detectedKeys = Array.from(
    new Set(cards.flatMap((c) => Object.keys(c.fields)))
  ).sort();

  let fieldMapping: FieldMapping = { title: detectedKeys[0] ?? '' };
  let skippedMapping = false;

  if (suppliedMapping?.title) {
    const resolves = cards.some((c) => c.fields[suppliedMapping.title!] !== undefined);
    if (resolves) {
      fieldMapping = suppliedMapping as FieldMapping;
      skippedMapping = true;
    } else {
      warnings.push('preconfigured_title_unresolved');
    }
  }

  return { name, cards, fieldMapping, detectedKeys, skippedMapping, warnings };
}
