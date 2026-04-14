import { uuid } from './uuid';
import type { Card, Exercise, FieldMapping } from './types';

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
  exercises: Exercise[];
  detectedKeys: string[];
  skippedMapping: boolean;
  warnings: string[];
};

const stripExt = (filename: string) => filename.replace(/\.json$/i, '');

function addWarningOnce(warnings: string[], code: string) {
  if (!warnings.includes(code)) warnings.push(code);
}

function parseExercises(raw: unknown, warnings: string[]): Exercise[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    addWarningOnce(warnings, 'exercise_entry_invalid');
    return [];
  }
  const out: Exercise[] = [];
  const seenIds = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      addWarningOnce(warnings, 'exercise_entry_invalid');
      continue;
    }
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id.trim() : '';
    if (!id) {
      addWarningOnce(warnings, 'exercise_id_invalid');
      continue;
    }
    if (seenIds.has(id)) {
      addWarningOnce(warnings, 'exercise_id_duplicate');
      continue;
    }
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    if (!name) {
      addWarningOnce(warnings, 'exercise_name_missing');
      continue;
    }
    if (e.instructions !== undefined && typeof e.instructions !== 'string') {
      addWarningOnce(warnings, 'exercise_instructions_invalid');
      continue;
    }
    const instructions = typeof e.instructions === 'string' ? e.instructions : '';
    if (!Array.isArray(e.groups)) {
      addWarningOnce(warnings, 'exercise_groups_missing');
      continue;
    }
    if ((e.groups as unknown[]).some((g) => typeof g !== 'string')) {
      addWarningOnce(warnings, 'exercise_groups_invalid');
      continue;
    }
    const groups = (e.groups as string[]).map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) {
      addWarningOnce(warnings, 'exercise_groups_missing');
      continue;
    }
    out.push({ id, name, instructions, groups });
    seenIds.add(id);
  }
  return out;
}

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
  let rawExercises: unknown;

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
    rawExercises = obj.exercises;
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

  const exercises = parseExercises(rawExercises, warnings);

  return { name, cards, fieldMapping, exercises, detectedKeys, skippedMapping, warnings };
}
