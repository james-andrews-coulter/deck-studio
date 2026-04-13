# Deck Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add author-defined, read-only "exercises" to decks — each with narrative instructions and a group template — and surface them at list creation and inside the list view as a peeking companion.

**Architecture:** Additive extensions to existing types (`Deck.exercises?`, `List.exerciseId?`); importer gains exercise validation; `createList` accepts an optional `exerciseId` that seeds the list's groups from the template; a new `ExercisePeekStrip` + `ExerciseSheet` render inside `ListScreen` using the existing shadcn `Sheet` primitive (mobile: bottom, desktop: right).

**Tech Stack:** TypeScript, React 18, Zustand, Vite, Vitest, React Testing Library, Playwright, Tailwind + shadcn/ui (Radix primitives), existing `@/components/ui/sheet`.

---

## Spec

This plan implements `docs/superpowers/specs/2026-04-13-deck-exercises-design.md`. Read that spec first. It is the source of truth for behavior; this plan is the source of truth for *how* we get there.

## File Map

**New files:**
- `src/lib/markdownLite.ts` — tiny markdown renderer (paragraphs, bold, italic, ul, ol, line breaks), XSS-safe
- `src/components/ExerciseSheet.tsx` — expanded panel with instructions + template
- `src/components/ExercisePeekStrip.tsx` — tap-to-open strip (mobile bottom / desktop right)
- `tests/unit/markdownLite.test.tsx`
- `tests/unit/importer-exercises.test.ts`
- `tests/unit/listsSlice-createList.test.ts`
- `tests/component/ExerciseSheet.test.tsx`
- `tests/component/ExercisePeekStrip.test.tsx`
- `tests/e2e/exercises.spec.ts`
- `tests/e2e/fixtures/sample-with-exercises.json`

**Modified files:**
- `src/lib/types.ts` — add `Exercise`, `Deck.exercises?`, `List.exerciseId?`
- `src/lib/importer.ts` — parse + validate `exercises`
- `src/store/decksSlice.ts` — persist `exercises` field through `addDeck`
- `src/store/listsSlice.ts` — `createList` gains optional `exerciseId`, seeds groups
- `src/store/uiSlice.ts` — new `exerciseSheetOpenByListId` map
- `src/store/migrations.ts` — bump `CURRENT_VERSION` to 2 (identity migration)
- `src/screens/ListsScreen.tsx` — exercise picker in new-list dialog, badge on list rows
- `src/screens/ListScreen.tsx` — render peek + sheet when `exerciseId` resolves
- `src/components/DeckDetailSheet.tsx` — exercise picker in the create-list field; `N exercises` disclosure chip
- `src/components/ImportDeckButton.tsx` — forward parsed `exercises` through to `addDeck`
- `public/sample-deck.json` — add two exercises
- `tests/unit/importer.test.ts` — add coverage (alternatively use dedicated test file; see Task 3)

## Conventions

- **TDD throughout:** failing test first, then the minimal code to pass.
- **Commit after each task** with message prefix `feat:` for user-facing changes, `refactor:` for plumbing, `test:` for tests-only when no implementation change ships.
- **Run tests to verify they fail BEFORE implementing** and to verify they pass AFTER. Output expectations are in each step.
- **Dev server** is already running on `http://localhost:5173`. Reload the page after each task that touches UI to verify behavior live.
- **No new third-party deps.** If you believe one is needed, stop and surface it.
- **Paths are absolute** where precision matters; relative where contextually clear.

---

## Task 1: Add exercise types + bump schema version

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/store/migrations.ts`

Exercises and `exerciseId` are additive and optional. This task only changes TypeScript types and the migration version — no runtime behavior changes.

- [ ] **Step 1:** Add the `Exercise` type and extend `Deck` and `List`.

Edit `src/lib/types.ts`. Add after the existing `FieldMapping` type:

```ts
export type Exercise = {
  id: string;
  name: string;
  instructions: string;
  groups: string[];
};
```

Extend `Deck`:

```ts
export type Deck = {
  id: string;
  name: string;
  importedAt: string;
  fieldMapping: FieldMapping;
  cards: Card[];
  exercises?: Exercise[];
};
```

Extend `List`:

```ts
export type List = {
  id: string;
  name: string;
  deckId: string;
  createdAt: string;
  updatedAt: string;
  groups: Group[];
  cardRefs: CardRef[];
  exerciseId?: string;
};
```

- [ ] **Step 2:** Bump schema version.

Edit `src/store/migrations.ts`:

```ts
export const CURRENT_VERSION = 2;

export function migrate(state: unknown, version: number): unknown {
  // v1 → v2: no data transformation needed; Deck.exercises and List.exerciseId
  // are both optional additions, so persisted v1 state is valid at v2 as-is.
  if (version === CURRENT_VERSION) return state;
  return state;
}
```

- [ ] **Step 3:** Typecheck.

Run: `npm run lint`
Expected: exits 0 (types compile).

- [ ] **Step 4:** Run the full unit + component test suite to confirm no regressions from the type changes.

Run: `npm test`
Expected: all existing tests still pass.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/types.ts src/store/migrations.ts
git commit -m "feat: add Exercise type and bump schema to v2"
```

---

## Task 2: Write `markdownLite` helper (TDD)

**Files:**
- Create: `src/lib/markdownLite.ts`
- Create: `tests/unit/markdownLite.test.ts`

The helper renders a small markdown subset — paragraphs (blank-line separated), `**bold**`, `*italic*`, unordered lists (consecutive `- ` lines), ordered lists (consecutive `N. ` lines), and line breaks on single newlines within a paragraph. Everything outside the subset renders as literal text. XSS-safe (no `dangerouslySetInnerHTML` on raw input).

Return value is a React element tree (`React.ReactNode`).

- [ ] **Step 1:** Write failing tests.

Create `tests/unit/markdownLite.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderMarkdownLite } from '@/lib/markdownLite';

function html(node: React.ReactNode): string {
  const { container } = render(<>{node}</>);
  return container.innerHTML;
}

describe('renderMarkdownLite', () => {
  it('renders a single paragraph', () => {
    const out = html(renderMarkdownLite('Hello world'));
    expect(out).toBe('<p>Hello world</p>');
  });

  it('splits paragraphs on blank lines', () => {
    const out = html(renderMarkdownLite('First.\n\nSecond.'));
    expect(out).toBe('<p>First.</p><p>Second.</p>');
  });

  it('renders single newlines as <br> within a paragraph', () => {
    const out = html(renderMarkdownLite('Line one\nLine two'));
    expect(out).toBe('<p>Line one<br>Line two</p>');
  });

  it('renders **bold** and *italic*', () => {
    const out = html(renderMarkdownLite('**strong** and *emph*'));
    expect(out).toBe('<p><strong>strong</strong> and <em>emph</em></p>');
  });

  it('renders an unordered list', () => {
    const out = html(renderMarkdownLite('- one\n- two\n- three'));
    expect(out).toBe('<ul><li>one</li><li>two</li><li>three</li></ul>');
  });

  it('renders an ordered list', () => {
    const out = html(renderMarkdownLite('1. one\n2. two\n3. three'));
    expect(out).toBe('<ol><li>one</li><li>two</li><li>three</li></ol>');
  });

  it('escapes HTML in plain text', () => {
    const out = html(renderMarkdownLite('<script>alert(1)</script>'));
    expect(out).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('escapes HTML inside inline marks', () => {
    const out = html(renderMarkdownLite('**<b>hi</b>**'));
    expect(out).toBe('<p><strong>&lt;b&gt;hi&lt;/b&gt;</strong></p>');
  });

  it('treats lines that look like headings as literal paragraphs', () => {
    const out = html(renderMarkdownLite('# Not a heading'));
    expect(out).toBe('<p># Not a heading</p>');
  });

  it('handles empty input', () => {
    const out = html(renderMarkdownLite(''));
    expect(out).toBe('');
  });

  it('handles mixed content', () => {
    const src = 'Intro paragraph.\n\n- first\n- second\n\nClosing **paragraph**.';
    const out = html(renderMarkdownLite(src));
    expect(out).toBe(
      '<p>Intro paragraph.</p><ul><li>first</li><li>second</li></ul><p>Closing <strong>paragraph</strong>.</p>'
    );
  });
});
```

- [ ] **Step 2:** Run tests to confirm they fail.

Run: `npm test -- tests/unit/markdownLite.test.tsx`
Expected: FAIL — `renderMarkdownLite` is not exported.

- [ ] **Step 3:** Implement.

Create `src/lib/markdownLite.ts`:

```ts
import React from 'react';

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ESC[c]);
}

type Inline = { type: 'text' | 'strong' | 'em'; text: string };

function tokenizeInline(raw: string): Inline[] {
  const tokens: Inline[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw.startsWith('**', i)) {
      const end = raw.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'strong', text: raw.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (raw[i] === '*') {
      const end = raw.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        tokens.push({ type: 'em', text: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // accumulate plain text until the next potential marker
    let j = i + 1;
    while (j < raw.length && raw[j] !== '*') j++;
    tokens.push({ type: 'text', text: raw.slice(i, j) });
    i = j;
  }
  return tokens;
}

function renderInline(raw: string, keyPrefix: string): React.ReactNode[] {
  const tokens = tokenizeInline(raw);
  const out: React.ReactNode[] = [];
  tokens.forEach((t, i) => {
    const key = `${keyPrefix}-${i}`;
    const escaped = escape(t.text);
    if (t.type === 'strong') {
      out.push(React.createElement('strong', { key }, escaped));
    } else if (t.type === 'em') {
      out.push(React.createElement('em', { key }, escaped));
    } else {
      out.push(React.createElement(React.Fragment, { key }, escaped));
    }
  });
  return out;
}

function renderParagraph(lines: string[], keyPrefix: string): React.ReactNode {
  const children: React.ReactNode[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) children.push(React.createElement('br', { key: `${keyPrefix}-br-${idx}` }));
    children.push(...renderInline(line, `${keyPrefix}-${idx}`));
  });
  return React.createElement('p', { key: keyPrefix }, ...children);
}

function renderList(
  tag: 'ul' | 'ol',
  items: string[],
  keyPrefix: string,
): React.ReactNode {
  const children = items.map((text, i) =>
    React.createElement('li', { key: `${keyPrefix}-${i}` }, ...renderInline(text, `${keyPrefix}-${i}`)),
  );
  return React.createElement(tag, { key: keyPrefix }, ...children);
}

export function renderMarkdownLite(src: string): React.ReactNode {
  if (!src) return null;
  const paragraphs = src.split(/\n\s*\n/);
  const blocks: React.ReactNode[] = [];
  paragraphs.forEach((para, pIdx) => {
    const lines = para.split('\n').map((l) => l.replace(/\s+$/, ''));
    // ordered list
    if (lines.every((l) => /^\d+\.\s+\S/.test(l))) {
      blocks.push(
        renderList(
          'ol',
          lines.map((l) => l.replace(/^\d+\.\s+/, '')),
          `p${pIdx}`,
        ),
      );
      return;
    }
    // unordered list
    if (lines.every((l) => /^-\s+\S/.test(l))) {
      blocks.push(
        renderList(
          'ul',
          lines.map((l) => l.replace(/^-\s+/, '')),
          `p${pIdx}`,
        ),
      );
      return;
    }
    blocks.push(renderParagraph(lines, `p${pIdx}`));
  });
  return React.createElement(React.Fragment, null, ...blocks);
}
```

- [ ] **Step 4:** Run tests to confirm they pass.

Run: `npm test -- tests/unit/markdownLite.test.tsx`
Expected: PASS (10 tests).

- [ ] **Step 5:** Commit.

```bash
git add src/lib/markdownLite.ts tests/unit/markdownLite.test.tsx
git commit -m "feat: add markdownLite renderer with XSS-safe subset"
```

---

## Task 3: Extend importer to parse exercises (TDD)

**Files:**
- Modify: `src/lib/importer.ts`
- Create: `tests/unit/importer-exercises.test.ts`

Rules (spec §5.1):
- `exercises` array is optional at the deck root.
- Each entry must be a non-null object with `id: string` (non-empty, unique), `name: string` (non-empty after trim), `instructions: string` (empty allowed; non-string rejects), `groups: string[]` (≥1 non-empty after trim; non-string entries reject the entry).
- Rejected entries are dropped with a warning code; remaining entries parse normally.
- Parsed `ParsedDeck` always exposes `exercises: Exercise[]` (possibly empty).

- [ ] **Step 1:** Write failing tests.

Create `tests/unit/importer-exercises.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseDeck } from '@/lib/importer';

const wrap = (exercises: unknown) =>
  JSON.stringify({
    name: 'D',
    cards: [{ t: 'a' }],
    exercises,
  });

describe('parseDeck — exercises', () => {
  it('returns empty exercises array when field is absent', () => {
    const out = parseDeck(JSON.stringify({ name: 'D', cards: [{ t: 'a' }] }), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).not.toContain('exercise_id_invalid');
  });

  it('returns empty exercises array when empty', () => {
    const out = parseDeck(wrap([]), 'd.json');
    expect(out.exercises).toEqual([]);
  });

  it('parses a well-formed exercise', () => {
    const out = parseDeck(
      wrap([
        {
          id: 'priority',
          name: 'Priority Planner',
          instructions: 'Sort by time horizon.',
          groups: ['This Week', 'This Month'],
        },
      ]),
      'd.json',
    );
    expect(out.exercises).toEqual([
      {
        id: 'priority',
        name: 'Priority Planner',
        instructions: 'Sort by time horizon.',
        groups: ['This Week', 'This Month'],
      },
    ]);
    expect(out.warnings).toHaveLength(0);
  });

  it('trims exercise name and group labels', () => {
    const out = parseDeck(
      wrap([{ id: 'x', name: '  Hi  ', instructions: '', groups: [' A ', 'B '] }]),
      'd.json',
    );
    expect(out.exercises[0]).toEqual({
      id: 'x',
      name: 'Hi',
      instructions: '',
      groups: ['A', 'B'],
    });
  });

  it('rejects entries that are not plain objects', () => {
    const out = parseDeck(wrap(['oops', null, 42]), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_entry_invalid');
  });

  it('rejects entry with missing / empty id', () => {
    const out = parseDeck(wrap([{ id: '', name: 'N', instructions: '', groups: ['g'] }]), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_id_invalid');
  });

  it('drops duplicate-id entries, keeping the first', () => {
    const out = parseDeck(
      wrap([
        { id: 'dup', name: 'First', instructions: '', groups: ['g'] },
        { id: 'dup', name: 'Second', instructions: '', groups: ['g'] },
      ]),
      'd.json',
    );
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0].name).toBe('First');
    expect(out.warnings).toContain('exercise_id_duplicate');
  });

  it('rejects entry with missing name', () => {
    const out = parseDeck(wrap([{ id: 'a', name: '  ', instructions: '', groups: ['g'] }]), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_name_missing');
  });

  it('rejects entry with non-string instructions', () => {
    const out = parseDeck(
      wrap([{ id: 'a', name: 'n', instructions: 123 as unknown, groups: ['g'] }]),
      'd.json',
    );
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_instructions_invalid');
  });

  it('rejects entry with empty groups after trimming', () => {
    const out = parseDeck(
      wrap([{ id: 'a', name: 'n', instructions: '', groups: ['', '  '] }]),
      'd.json',
    );
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_groups_missing');
  });

  it('rejects entry with non-string groups', () => {
    const out = parseDeck(
      wrap([{ id: 'a', name: 'n', instructions: '', groups: ['ok', 7 as unknown] }]),
      'd.json',
    );
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_groups_invalid');
  });

  it('preserves valid exercises even when later ones are rejected', () => {
    const out = parseDeck(
      wrap([
        { id: 'ok', name: 'OK', instructions: '', groups: ['g'] },
        { id: '', name: 'bad', instructions: '', groups: ['g'] },
        { id: 'ok2', name: 'OK2', instructions: '', groups: ['g'] },
      ]),
      'd.json',
    );
    expect(out.exercises.map((e) => e.id)).toEqual(['ok', 'ok2']);
    expect(out.warnings).toContain('exercise_id_invalid');
  });
});
```

- [ ] **Step 2:** Run tests to confirm they fail.

Run: `npm test -- tests/unit/importer-exercises.test.ts`
Expected: FAIL — importer has no knowledge of exercises; `ParsedDeck.exercises` does not exist.

- [ ] **Step 3:** Implement in `src/lib/importer.ts`.

Edit the file. Add import of `Exercise`:

```ts
import type { Card, Exercise, FieldMapping } from './types';
```

Extend `ParsedDeck`:

```ts
export type ParsedDeck = {
  name: string;
  cards: Card[];
  fieldMapping: FieldMapping;
  exercises: Exercise[];
  detectedKeys: string[];
  skippedMapping: boolean;
  warnings: string[];
};
```

Before the final `return` in `parseDeck`, parse exercises. Full helper plus integration:

```ts
function parseExercises(
  raw: unknown,
  warnings: string[],
): Exercise[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    warnings.push('exercise_entry_invalid');
    return [];
  }
  const out: Exercise[] = [];
  const seenIds = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      if (!warnings.includes('exercise_entry_invalid')) warnings.push('exercise_entry_invalid');
      continue;
    }
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id.trim() : '';
    if (!id) {
      if (!warnings.includes('exercise_id_invalid')) warnings.push('exercise_id_invalid');
      continue;
    }
    if (seenIds.has(id)) {
      if (!warnings.includes('exercise_id_duplicate')) warnings.push('exercise_id_duplicate');
      continue;
    }
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    if (!name) {
      if (!warnings.includes('exercise_name_missing')) warnings.push('exercise_name_missing');
      continue;
    }
    if (e.instructions !== undefined && typeof e.instructions !== 'string') {
      if (!warnings.includes('exercise_instructions_invalid'))
        warnings.push('exercise_instructions_invalid');
      continue;
    }
    const instructions = typeof e.instructions === 'string' ? e.instructions : '';
    if (!Array.isArray(e.groups)) {
      if (!warnings.includes('exercise_groups_missing'))
        warnings.push('exercise_groups_missing');
      continue;
    }
    if (e.groups.some((g) => typeof g !== 'string')) {
      if (!warnings.includes('exercise_groups_invalid'))
        warnings.push('exercise_groups_invalid');
      continue;
    }
    const groups = (e.groups as string[]).map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) {
      if (!warnings.includes('exercise_groups_missing'))
        warnings.push('exercise_groups_missing');
      continue;
    }
    out.push({ id, name, instructions, groups });
    seenIds.add(id);
  }
  return out;
}
```

In `parseDeck`, read the `exercises` field from the object shape (guard the array branch — plain-array decks can't have exercises):

Where `suppliedMapping` is read (inside `if (!Array.isArray(data))` → object branch), also read `obj.exercises`:

```ts
const rawExercises = obj.exercises;
```

Then, before the return, compute parsed exercises:

```ts
const exercises = parseExercises(rawExercises ?? undefined, warnings);
```

For the plain-array branch (which can't carry exercises), default to `[]`. The cleanest approach is to declare `let rawExercises: unknown;` next to `let suppliedMapping: …;` and assign from the object branch only.

Finally include `exercises` in the return:

```ts
return { name, cards, fieldMapping, exercises, detectedKeys, skippedMapping, warnings };
```

- [ ] **Step 4:** Run new tests.

Run: `npm test -- tests/unit/importer-exercises.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5:** Run full suite — the existing `importer.test.ts` should still pass but now it will access `parsed.exercises`; ensure no test breaks.

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6:** Commit.

```bash
git add src/lib/importer.ts tests/unit/importer-exercises.test.ts
git commit -m "feat: parse and validate exercises in importer"
```

---

## Task 4: Persist exercises through `addDeck`

**Files:**
- Modify: `src/components/ImportDeckButton.tsx`
- Modify: `src/store/decksSlice.ts` (no code change needed — `addDeck` spreads input — but verify)
- Modify: `tests/component/…` only if existing test asserts shape

The importer now returns `exercises`. `ImportDeckButton` currently passes `{ name, fieldMapping, cards }` to `addDeck`. It needs to forward `exercises` as well (but only when non-empty, to keep persisted shape clean).

- [ ] **Step 1:** Update `src/components/ImportDeckButton.tsx`.

Replace the `addDeck({ ... })` call with:

```ts
const id = addDeck({
  name: parsed.name,
  fieldMapping: parsed.fieldMapping,
  cards: parsed.cards,
  ...(parsed.exercises.length > 0 ? { exercises: parsed.exercises } : {}),
});
```

Also surface a non-blocking toast when exercise warnings are present. After the existing `duplicate_ids` toast block, add:

```ts
const skippedCount = parsed.warnings.filter((w) => w.startsWith('exercise_')).length;
if (skippedCount > 0) {
  toast.warning('Some exercises were skipped — check the deck JSON.');
}
```

- [ ] **Step 2:** Typecheck + full tests.

Run: `npm run lint && npm test`
Expected: all pass (`addDeck` types via `Omit<Deck, 'id' | 'importedAt'>` already accepts optional `exercises`).

- [ ] **Step 3:** Commit.

```bash
git add src/components/ImportDeckButton.tsx
git commit -m "feat: forward exercises from importer into stored deck"
```

---

## Task 5: Extend `createList` to seed groups from an exercise (TDD)

**Files:**
- Modify: `src/store/listsSlice.ts`
- Create: `tests/unit/listsSlice-createList.test.ts`

`createList(deckId, name)` becomes `createList(deckId, name, exerciseId?)`. If `exerciseId` is supplied, look it up on the deck, seed `groups` in template order, set `list.exerciseId`. Unresolving id throws (defensive — UI never surfaces unresolvable ids).

- [ ] **Step 1:** Write failing tests.

Create `tests/unit/listsSlice-createList.test.ts`:

```ts
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
    cards: [{ id: 'c1', fields: { t: 'a' } }, { id: 'c2', fields: { t: 'b' } }],
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
```

- [ ] **Step 2:** Run tests — expect failures (signature mismatch).

Run: `npm test -- tests/unit/listsSlice-createList.test.ts`
Expected: FAIL.

- [ ] **Step 3:** Implement in `src/store/listsSlice.ts`.

Update the slice type:

```ts
createList: (deckId: string, name: string, exerciseId?: string) => string;
```

Replace the existing `createList` body:

```ts
createList: (deckId, name, exerciseId) => {
  const deck = get().decks[deckId];
  if (!deck) throw new Error(`Deck ${deckId} not found`);
  const id = uuid();
  const now = new Date().toISOString();
  let seededGroups: Group[] = [];
  let boundExerciseId: string | undefined;
  if (exerciseId) {
    const ex = deck.exercises?.find((e) => e.id === exerciseId);
    if (!ex) throw new Error(`Exercise ${exerciseId} not found on deck ${deckId}`);
    seededGroups = ex.groups.map((label) => ({ id: uuid(), name: label, color: 'slate' }));
    boundExerciseId = ex.id;
  }
  const list: List = {
    id,
    name,
    deckId,
    createdAt: now,
    updatedAt: now,
    groups: seededGroups,
    cardRefs: deck.cards.map((c) => ({ cardId: c.id, hidden: false, groupId: null })),
    ...(boundExerciseId ? { exerciseId: boundExerciseId } : {}),
  };
  set((s) => ({ lists: { ...s.lists, [id]: list } }));
  return id;
},
```

(`duplicateList` already spreads `src`, so `exerciseId` copies automatically — no change needed. The test verifies this.)

- [ ] **Step 4:** Run tests.

Run: `npm test -- tests/unit/listsSlice-createList.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5:** Full test suite — `ListsScreen.test.tsx` and `DeckDetailSheet.test.tsx` call `createList(deckId, name)` without the third arg — must still work (arg is optional).

Run: `npm test`
Expected: all pass.

- [ ] **Step 6:** Commit.

```bash
git add src/store/listsSlice.ts tests/unit/listsSlice-createList.test.ts
git commit -m "feat: seed list groups from exercise template in createList"
```

---

## Task 6: Add `exerciseSheetOpenByListId` to UI slice

**Files:**
- Modify: `src/store/uiSlice.ts`

Track expanded-panel open state per list, scoped by listId so multiple lists don't leak state into each other.

- [ ] **Step 1:** Edit `src/store/uiSlice.ts`. Final file:

```ts
import type { StateCreator } from 'zustand';

export type UISlice = {
  ui: {
    collapsedGroups: Record<string, boolean>;
    hiddenSheetOpen: boolean;
    activeDeckDetail: string | null;
    exerciseSheetOpenByListId: Record<string, boolean>;
  };
  toggleGroupCollapsed: (groupId: string) => void;
  setHiddenSheetOpen: (open: boolean) => void;
  setDeckDetail: (id: string | null) => void;
  setExerciseSheetOpen: (listId: string, open: boolean) => void;
};

export const createUiSlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  ui: {
    collapsedGroups: {},
    hiddenSheetOpen: false,
    activeDeckDetail: null,
    exerciseSheetOpenByListId: {},
  },
  toggleGroupCollapsed: (groupId) =>
    set((s) => ({
      ui: {
        ...s.ui,
        collapsedGroups: { ...s.ui.collapsedGroups, [groupId]: !s.ui.collapsedGroups[groupId] },
      },
    })),
  setHiddenSheetOpen: (open) => set((s) => ({ ui: { ...s.ui, hiddenSheetOpen: open } })),
  setDeckDetail: (id) => set((s) => ({ ui: { ...s.ui, activeDeckDetail: id } })),
  setExerciseSheetOpen: (listId, open) =>
    set((s) => ({
      ui: {
        ...s.ui,
        exerciseSheetOpenByListId: { ...s.ui.exerciseSheetOpenByListId, [listId]: open },
      },
    })),
});
```

- [ ] **Step 2:** Typecheck + tests.

Run: `npm run lint && npm test`
Expected: all pass.

- [ ] **Step 3:** Commit.

```bash
git add src/store/uiSlice.ts
git commit -m "feat: add per-list exercise sheet open state"
```

---

## Task 7: Build `ExerciseSheet` component (TDD)

**Files:**
- Create: `src/components/ExerciseSheet.tsx`
- Create: `tests/component/ExerciseSheet.test.tsx`

Renders an expanded sheet (bottom on mobile, right on desktop — but Radix `SheetContent` side prop is a single value; we pick responsive via `className` and a small CSS hack is unnecessary — use `side="right"` and let Tailwind classes give it a full-height, viewport-aware width). Revisit if UX feels off after visual verification.

**Implementation note:** since the shadcn `Sheet` primitive's `side` prop is static, pick `side="bottom"` always and rely on CSS to feel correct on desktop (a centered bottom sheet with `md:ml-auto md:max-w-md md:rounded-tl-xl md:rounded-tr-none md:right-0`). This is the simplest path and keeps one codepath. If desktop feels wrong during manual verification, open a follow-up — do not rewrite here.

- [ ] **Step 1:** Write failing tests.

Create `tests/component/ExerciseSheet.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseSheet } from '@/components/ExerciseSheet';
import { useAppStore } from '@/store';

function setup(hasExerciseOnDeck: boolean) {
  useAppStore.setState({ decks: {}, lists: {}, ui: { collapsedGroups: {}, hiddenSheetOpen: false, activeDeckDetail: null, exerciseSheetOpenByListId: {} } });
  const deckId = useAppStore.getState().addDeck({
    name: 'D',
    fieldMapping: { title: 't' },
    cards: [{ id: 'c1', fields: { t: 'x' } }],
    ...(hasExerciseOnDeck
      ? {
          exercises: [
            {
              id: 'priority',
              name: 'Priority Planner',
              instructions: 'Sort **fast**.\n\n- short\n- long',
              groups: ['A', 'B'],
            },
          ],
        }
      : {}),
  });
  const listId = useAppStore.getState().createList(deckId, 'L', hasExerciseOnDeck ? 'priority' : undefined);
  return { listId };
}

describe('ExerciseSheet', () => {
  beforeEach(() => {
    useAppStore.setState({ decks: {}, lists: {}, ui: { collapsedGroups: {}, hiddenSheetOpen: false, activeDeckDetail: null, exerciseSheetOpenByListId: {} } });
  });

  it('renders nothing when list has no exerciseId', () => {
    const { listId } = setup(false);
    const { container } = render(<ExerciseSheet listId={listId} />);
    expect(container.textContent).toBe('');
  });

  it('opens via store state and renders instructions + template', async () => {
    const { listId } = setup(true);
    useAppStore.getState().setExerciseSheetOpen(listId, true);
    render(<ExerciseSheet listId={listId} />);
    expect(await screen.findByText('Priority Planner')).toBeInTheDocument();
    expect(screen.getByText('short')).toBeInTheDocument();
    expect(screen.getByText('long')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('shows template labels even after list groups are renamed', async () => {
    const { listId } = setup(true);
    const list = useAppStore.getState().lists[listId];
    useAppStore.getState().renameGroup(listId, list.groups[0].id, 'CUSTOM');
    useAppStore.getState().setExerciseSheetOpen(listId, true);
    render(<ExerciseSheet listId={listId} />);
    expect(await screen.findByText('A')).toBeInTheDocument(); // original template label still shown
  });

  it('closes via the close button', async () => {
    const { listId } = setup(true);
    useAppStore.getState().setExerciseSheetOpen(listId, true);
    render(<ExerciseSheet listId={listId} />);
    const user = userEvent.setup();
    const closeBtns = await screen.findAllByRole('button', { name: /close/i });
    await user.click(closeBtns[0]);
    expect(useAppStore.getState().ui.exerciseSheetOpenByListId[listId]).toBe(false);
  });
});
```

- [ ] **Step 2:** Run tests — expect failures (component missing).

Run: `npm test -- tests/component/ExerciseSheet.test.tsx`
Expected: FAIL.

- [ ] **Step 3:** Implement.

Create `src/components/ExerciseSheet.tsx`:

```tsx
import { useAppStore } from '@/store';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from './ui/sheet';
import { renderMarkdownLite } from '@/lib/markdownLite';

type Props = { listId: string };

export function ExerciseSheet({ listId }: Props) {
  const open = useAppStore((s) => !!s.ui.exerciseSheetOpenByListId[listId]);
  const setOpen = useAppStore((s) => s.setExerciseSheetOpen);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const exercise = list?.exerciseId
    ? deck?.exercises?.find((e) => e.id === list.exerciseId)
    : undefined;

  if (!exercise) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => setOpen(listId, o)}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto md:right-0 md:left-auto md:ml-auto md:max-w-md md:rounded-tl-xl md:rounded-tr-none md:rounded-bl-none md:rounded-br-none md:h-[85vh] md:max-h-none md:border-l md:border-r-0"
      >
        <SheetHeader>
          <SheetTitle>{exercise.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-4 text-sm leading-relaxed">
          <div>{renderMarkdownLite(exercise.instructions)}</div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Template
            </div>
            <ul className="mt-2 space-y-1">
              {exercise.groups.map((label, i) => (
                <li
                  key={`${label}-${i}`}
                  className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Your list's groups can differ — this is the original exercise template.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4:** Run tests.

Run: `npm test -- tests/component/ExerciseSheet.test.tsx`
Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/components/ExerciseSheet.tsx tests/component/ExerciseSheet.test.tsx
git commit -m "feat: ExerciseSheet renders instructions and template"
```

---

## Task 8: Build `ExercisePeekStrip` component (TDD)

**Files:**
- Create: `src/components/ExercisePeekStrip.tsx`
- Create: `tests/component/ExercisePeekStrip.test.tsx`

Tap-to-open strip. Renders nothing if the list has no resolved exercise. On mobile: fixed to bottom. On desktop: fixed to right edge. Accessible: a `<button>` with `aria-label` naming the exercise.

- [ ] **Step 1:** Write failing tests.

Create `tests/component/ExercisePeekStrip.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisePeekStrip } from '@/components/ExercisePeekStrip';
import { useAppStore } from '@/store';

function setup(hasExercise: boolean) {
  useAppStore.setState({ decks: {}, lists: {}, ui: { collapsedGroups: {}, hiddenSheetOpen: false, activeDeckDetail: null, exerciseSheetOpenByListId: {} } });
  const deckId = useAppStore.getState().addDeck({
    name: 'D',
    fieldMapping: { title: 't' },
    cards: [{ id: 'c1', fields: { t: 'x' } }],
    ...(hasExercise
      ? {
          exercises: [
            { id: 'priority', name: 'Priority Planner', instructions: '', groups: ['A'] },
          ],
        }
      : {}),
  });
  const listId = useAppStore
    .getState()
    .createList(deckId, 'L', hasExercise ? 'priority' : undefined);
  return { listId };
}

describe('ExercisePeekStrip', () => {
  beforeEach(() => {
    useAppStore.setState({ decks: {}, lists: {}, ui: { collapsedGroups: {}, hiddenSheetOpen: false, activeDeckDetail: null, exerciseSheetOpenByListId: {} } });
  });

  it('renders nothing when list has no exerciseId', () => {
    const { listId } = setup(false);
    const { container } = render(<ExercisePeekStrip listId={listId} />);
    expect(container.textContent).toBe('');
  });

  it('renders the exercise name and opens the sheet on click', async () => {
    const { listId } = setup(true);
    render(<ExercisePeekStrip listId={listId} />);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /priority planner/i });
    await user.click(btn);
    expect(useAppStore.getState().ui.exerciseSheetOpenByListId[listId]).toBe(true);
  });

  it('renders nothing when exerciseId is unresolved', () => {
    const { listId } = setup(true);
    // simulate post-re-import drop: remove exercises from deck
    const list = useAppStore.getState().lists[listId];
    useAppStore.setState((s) => ({
      decks: {
        ...s.decks,
        [list.deckId]: { ...s.decks[list.deckId], exercises: [] },
      },
    }));
    const { container } = render(<ExercisePeekStrip listId={listId} />);
    expect(container.textContent).toBe('');
  });
});
```

- [ ] **Step 2:** Run tests — FAIL.

Run: `npm test -- tests/component/ExercisePeekStrip.test.tsx`

- [ ] **Step 3:** Implement.

Create `src/components/ExercisePeekStrip.tsx`:

```tsx
import { useAppStore } from '@/store';
import { Info } from 'lucide-react';

type Props = { listId: string };

export function ExercisePeekStrip({ listId }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const exercise = list?.exerciseId
    ? deck?.exercises?.find((e) => e.id === list.exerciseId)
    : undefined;
  const setOpen = useAppStore((s) => s.setExerciseSheetOpen);
  if (!exercise) return null;
  return (
    <button
      type="button"
      aria-label={`${exercise.name} — view guide`}
      onClick={() => setOpen(listId, true)}
      className="fixed inset-x-0 bottom-12 z-30 flex h-11 items-center justify-between border-t bg-background px-4 text-sm shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:inset-y-0 md:bottom-auto md:right-0 md:left-auto md:top-0 md:h-full md:w-10 md:flex-col md:justify-center md:gap-3 md:border-l md:border-t-0 md:px-0 md:shadow-[-4px_0_12px_rgba(0,0,0,0.06)]"
    >
      <span className="truncate font-medium md:hidden">{exercise.name}</span>
      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground md:ml-0 md:flex-col md:gap-2">
        <Info aria-hidden className="h-4 w-4" />
        <span className="md:[writing-mode:vertical-rl] md:rotate-180 md:text-[11px]">
          <span className="md:hidden">View guide →</span>
          <span className="hidden md:inline">{exercise.name}</span>
        </span>
      </span>
    </button>
  );
}
```

Note on positioning: mobile fixed-to-bottom sits at `bottom-12` (≈48px) to clear the BottomTabs (empirical — BottomTabs height derives from its `py-2.5` + icon + label; verify clearance during Task 15 manual check and bump the offset if needed). Desktop is fixed to the right edge, full-height, narrow.

- [ ] **Step 4:** Run tests.

Run: `npm test -- tests/component/ExercisePeekStrip.test.tsx`
Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/components/ExercisePeekStrip.tsx tests/component/ExercisePeekStrip.test.tsx
git commit -m "feat: ExercisePeekStrip opens sheet via tap"
```

---

## Task 9: Integrate companion into `ListScreen`

**Files:**
- Modify: `src/screens/ListScreen.tsx`

Render `ExercisePeekStrip` and `ExerciseSheet` inside the view-mode branch (not in swipe mode). Place near the existing `HiddenCardsSheet` block.

- [ ] **Step 1:** Edit `src/screens/ListScreen.tsx`.

Add imports near other component imports:

```ts
import { ExercisePeekStrip } from '@/components/ExercisePeekStrip';
import { ExerciseSheet } from '@/components/ExerciseSheet';
```

Inside the `{mode === 'swipe' ? <SwipeSession /> : <>…</>}` view-mode branch, immediately before `<HiddenCardsSheet listId={list.id} />`, insert:

```tsx
<ExercisePeekStrip listId={list.id} />
<ExerciseSheet listId={list.id} />
```

Also: if the view is the only scrolling container and the new peek strip fixed-to-bottom overlaps content, ensure the outer `<div>` has enough bottom padding. Change `className="p-3 md:p-5"` to `className="p-3 pb-24 md:p-5 md:pr-16"` **only when** a resolved exercise is bound. Simplest way: compute

```ts
const hasResolvedExercise = !!(list.exerciseId && deck.exercises?.some((e) => e.id === list.exerciseId));
```

and use it in a `cn(...)` wrapper on the outer div's className. Apply the extra padding only in view mode.

- [ ] **Step 2:** Run tests — existing `ListScreen.test.tsx` must still pass.

Run: `npm test -- tests/component/ListScreen.test.tsx`
Expected: PASS.

- [ ] **Step 3:** Dev-server check (manual).

Open `http://localhost:5173` → create a list that has no exerciseId → list view is unchanged. Create another list with an exercise → peek strip renders at the bottom, doesn't cover the bottom nav, tapping opens the expanded sheet.

- [ ] **Step 4:** Commit.

```bash
git add src/screens/ListScreen.tsx
git commit -m "feat: render exercise peek + sheet inside ListScreen"
```

---

## Task 10: Extend `ListsScreen` new-list dialog with the exercise picker

**Files:**
- Modify: `src/screens/ListsScreen.tsx`

Add an optional exercise `<select>` between the deck selector and the name input. Only rendered if the chosen deck has ≥1 exercise. Auto-fill the name from the picked exercise unless the user has typed a custom name. Show a single-line preview of the seeded groups when an exercise is selected.

- [ ] **Step 1:** Edit `src/screens/ListsScreen.tsx`. Add component state:

```ts
const [wizardExerciseId, setWizardExerciseId] = useState<string>('');
const [nameAutoFillSource, setNameAutoFillSource] = useState<string | null>(null);
```

Replace `createList(wizardDeckId, wizardName.trim())` with:

```ts
const id = createList(
  wizardDeckId,
  wizardName.trim(),
  wizardExerciseId || undefined,
);
```

Derive the current deck's exercises:

```ts
const wizardDeck = wizardDeckId ? decksById[wizardDeckId] : undefined;
const wizardExercises = wizardDeck?.exercises ?? [];
const wizardExercise = wizardExerciseId
  ? wizardExercises.find((e) => e.id === wizardExerciseId)
  : undefined;
```

Reset exercise + auto-fill tracking when the deck changes:

```ts
const onDeckChange = (id: string) => {
  setWizardDeckId(id);
  setWizardExerciseId('');
  // If the name was auto-filled, clear it so the new deck can drive a fresh fill.
  if (nameAutoFillSource && wizardName === nameAutoFillSource) {
    setWizardName('');
    setNameAutoFillSource(null);
  }
};
```

Swap the deck `<select>` `onChange` to call `onDeckChange(e.target.value)`.

Render the exercise selector + preview only when `wizardExercises.length > 0`:

```tsx
{wizardExercises.length > 0 && (
  <label className="block text-sm font-medium">
    Exercise (optional)
    <select
      className="mt-1 w-full rounded-md border bg-background p-2 text-base"
      value={wizardExerciseId}
      onChange={(e) => {
        const nextId = e.target.value;
        setWizardExerciseId(nextId);
        const ex = wizardExercises.find((x) => x.id === nextId);
        const nameIsEmptyOrAutoFilled =
          !wizardName.trim() || wizardName === nameAutoFillSource;
        if (ex && nameIsEmptyOrAutoFilled) {
          setWizardName(ex.name);
          setNameAutoFillSource(ex.name);
        }
      }}
    >
      <option value="">None — start empty</option>
      {wizardExercises.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
        </option>
      ))}
    </select>
    {wizardExercise && (
      <p className="mt-1 truncate text-xs text-muted-foreground">
        Seeds {wizardExercise.groups.length} group
        {wizardExercise.groups.length === 1 ? '' : 's'}:{' '}
        {wizardExercise.groups.join(' · ')}
      </p>
    )}
  </label>
)}
```

Also in the name input's `onChange`, clear the auto-fill source tracking if the user types over it:

```tsx
onChange={(e) => {
  const v = e.target.value;
  setWizardName(v);
  if (nameAutoFillSource && v !== nameAutoFillSource) setNameAutoFillSource(null);
}}
```

Reset the exercise and auto-fill source when the dialog opens (inside the existing `setWizardOpen(true)` handler or via a `useEffect` on `wizardOpen`). Simplest: inside `onCreate` after a successful create, also reset `setWizardExerciseId('')` and `setNameAutoFillSource(null)`.

- [ ] **Step 2:** Run existing component tests.

Run: `npm test -- tests/component/ListsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 3:** Add new tests. Append a `describe('new list dialog with exercise picker', …)` suite to `tests/component/ListsScreen.test.tsx` with at least these cases (read the existing file for setup/idioms, then add):

- Deck with no exercises → the Exercise `<select>` is absent from the DOM.
- Deck with exercises → `<select>` present; default selection is `None — start empty`.
- Picking an exercise with an empty Name input → Name gets auto-filled to the exercise name; the preview line appears with the group labels.
- Typing a custom name, then picking an exercise → Name is NOT overwritten.
- Creating the list with an exercise selected → `createList` is called with the exercise id as the third arg (you can assert via the resulting list's `exerciseId` in the store OR by spying on `createList`).

- [ ] **Step 4:** Run the new tests.

Run: `npm test -- tests/component/ListsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/screens/ListsScreen.tsx tests/component/ListsScreen.test.tsx
git commit -m "feat: exercise picker in new-list dialog"
```

---

## Task 11: Add exercise badge on Lists index

**Files:**
- Modify: `src/screens/ListsScreen.tsx`
- Modify: `tests/component/ListsScreen.test.tsx`

Show the bound exercise's name as a subtle muted label under the existing meta line, only when it resolves.

- [ ] **Step 1:** Inside the list row's render block, after the existing meta `<div>`, add:

```tsx
{(() => {
  const ex = l.exerciseId
    ? deck?.exercises?.find((e) => e.id === l.exerciseId)
    : undefined;
  if (!ex) return null;
  return (
    <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
      {ex.name}
    </div>
  );
})()}
```

- [ ] **Step 2:** Add a component test case:

- Given two lists — one with a resolved `exerciseId`, one without — only the first shows the exercise name under its row.
- Given a list with `exerciseId` that does not resolve on the deck, no badge renders.

- [ ] **Step 3:** Run tests.

Run: `npm test -- tests/component/ListsScreen.test.tsx`
Expected: PASS.

- [ ] **Step 4:** Commit.

```bash
git add src/screens/ListsScreen.tsx tests/component/ListsScreen.test.tsx
git commit -m "feat: show exercise name on lists index rows"
```

---

## Task 12: Add picker + chip to `DeckDetailSheet`

**Files:**
- Modify: `src/components/DeckDetailSheet.tsx`
- Modify: `tests/component/DeckDetailSheet.test.tsx`

Two additions:
1. Show a muted `N exercises` chip beneath the deck name when the deck has exercises.
2. The inline "Create a new list from this deck" field gains the same exercise `<select>` behavior as in `ListsScreen` (picker + preview + auto-fill).

The logic mirrors Task 10 — keep the implementation tight and avoid duplication. Rather than a shared component (YAGNI), each form uses its own inline select; if this becomes a maintenance issue later, extract then.

- [ ] **Step 1:** Edit `src/components/DeckDetailSheet.tsx`.

After `<SheetDescription>`, add the chip:

```tsx
{deck && deck.exercises && deck.exercises.length > 0 && (
  <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
    {deck.exercises.length} {deck.exercises.length === 1 ? 'exercise' : 'exercises'}
  </span>
)}
```

Add state for the picker + auto-fill:

```tsx
const [exerciseId, setExerciseId] = useState<string>('');
const [autoFillSource, setAutoFillSource] = useState<string | null>(null);
```

Clear the picker and source in the existing effect that resets `listName` on deck change:

```tsx
useEffect(() => {
  if (deckId) {
    setListName('');
    setExerciseId('');
    setAutoFillSource(null);
  }
}, [deckId]);
```

Inside the inline-form block, just below the `listName` input, render the selector only when the deck has exercises:

```tsx
{deck?.exercises && deck.exercises.length > 0 && (
  <label className="block text-sm font-medium">
    Exercise (optional)
    <select
      className="mt-1 w-full rounded-md border bg-background p-2 text-base"
      value={exerciseId}
      onChange={(e) => {
        const nextId = e.target.value;
        setExerciseId(nextId);
        const ex = deck.exercises!.find((x) => x.id === nextId);
        const nameIsEmptyOrAutoFilled =
          !listName.trim() || listName === autoFillSource;
        if (ex && nameIsEmptyOrAutoFilled) {
          setListName(ex.name);
          setAutoFillSource(ex.name);
        }
      }}
    >
      <option value="">None — start empty</option>
      {deck.exercises.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
        </option>
      ))}
    </select>
    {exerciseId && (
      (() => {
        const ex = deck.exercises!.find((x) => x.id === exerciseId);
        if (!ex) return null;
        return (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Seeds {ex.groups.length} group
            {ex.groups.length === 1 ? '' : 's'}: {ex.groups.join(' · ')}
          </p>
        );
      })()
    )}
  </label>
)}
```

Update `onCreateList`:

```tsx
const onCreateList = () => {
  if (!deckId || !listName.trim()) return;
  const newListId = createList(deckId, listName.trim(), exerciseId || undefined);
  closeSheet();
  navigate(`/lists/${newListId}`);
};
```

And the name input's onChange:

```tsx
onChange={(e) => {
  const v = e.target.value;
  setListName(v);
  if (autoFillSource && v !== autoFillSource) setAutoFillSource(null);
}}
```

- [ ] **Step 2:** Add test cases to `tests/component/DeckDetailSheet.test.tsx`:

- Deck with no exercises → chip absent, picker absent.
- Deck with exercises → chip shows correct count, picker present.
- Picking an exercise auto-fills the list name.
- Creating a list with the exercise → created list has the exerciseId.

- [ ] **Step 3:** Run tests.

Run: `npm test -- tests/component/DeckDetailSheet.test.tsx`
Expected: PASS.

- [ ] **Step 4:** Commit.

```bash
git add src/components/DeckDetailSheet.tsx tests/component/DeckDetailSheet.test.tsx
git commit -m "feat: exercise picker + count chip on deck detail sheet"
```

---

## Task 13: Extend the bundled sample deck

**Files:**
- Modify: `public/sample-deck.json`

Add two exercises so the feature is demo-able after importing the sample.

- [ ] **Step 1:** Edit `public/sample-deck.json`. Append to the root:

```json
  "exercises": [
    {
      "id": "priority-planner",
      "name": "Priority Planner",
      "instructions": "Our goals and priorities are not uniform: they require differing amounts of effort, and different timeframes in which they can be achieved.\n\nOnce you've selected a number of goals and priorities you wish to work towards, arrange them according to the time you expect it will take you to achieve them.",
      "groups": ["This Week", "This Month", "This Year", "Next Five Years", "Over a Lifetime"]
    },
    {
      "id": "keep-maybe-park",
      "name": "Keep / Maybe / Park",
      "instructions": "A fast triage. Move each card into one of three buckets based on your gut read.\n\n- **Keep:** you're confident it belongs.\n- **Maybe:** you're unsure — come back later.\n- **Park:** not now.",
      "groups": ["Keep", "Maybe", "Park"]
    }
  ]
```

Ensure the final JSON is valid (comma placement).

- [ ] **Step 2:** Verify the sample imports cleanly.

Open `http://localhost:5173`. Reset storage (devtools → Application → IndexedDB → delete `deck-studio:state` — or use the app's existing reset path if any). Import `public/sample-deck.json` (or drag-drop). In Lists, create a new list → the Exercise picker should show 2 options.

- [ ] **Step 3:** Commit.

```bash
git add public/sample-deck.json
git commit -m "feat: add two exercises to bundled sample deck"
```

---

## Task 14: E2E test for the golden exercise flow

**Files:**
- Create: `tests/e2e/exercises.spec.ts`
- Create: `tests/e2e/fixtures/sample-with-exercises.json`

- [ ] **Step 1:** Create the fixture at `tests/e2e/fixtures/sample-with-exercises.json`. Keep it small and self-contained (matches existing `tests/e2e/fixtures/sample.json` style; open that file for reference):

```json
{
  "name": "E2E Exercise Deck",
  "fieldMapping": { "title": "t" },
  "cards": [
    { "id": "c1", "t": "Alpha" },
    { "id": "c2", "t": "Beta" },
    { "id": "c3", "t": "Gamma" }
  ],
  "exercises": [
    {
      "id": "triage",
      "name": "Triage",
      "instructions": "Keep or park each card.",
      "groups": ["Keep", "Park"]
    }
  ]
}
```

- [ ] **Step 2:** Create `tests/e2e/exercises.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('exercise picker seeds groups and companion opens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles(
    'input[type=file]',
    path.join(__dirname, 'fixtures/sample-with-exercises.json'),
  );

  await expect(page.getByRole('button', { name: /E2E Exercise Deck/ })).toBeVisible();

  await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();

  // Pick deck
  await page.getByRole('combobox').first().selectOption({ label: 'E2E Exercise Deck' });

  // Pick exercise
  await page.getByRole('combobox', { name: /exercise/i }).selectOption({ label: 'Triage' });

  // Name should auto-fill
  await expect(page.getByPlaceholder(/shortlist/i)).toHaveValue('Triage');

  // Create
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page).toHaveURL(/\/lists\/[^/]+$/);

  // Seeded groups visible
  await expect(page.getByText('Keep', { exact: true })).toBeVisible();
  await expect(page.getByText('Park', { exact: true })).toBeVisible();

  // Peek strip visible
  const peek = page.getByRole('button', { name: /triage.*view guide/i });
  await expect(peek).toBeVisible();

  // Open expanded sheet
  await peek.click();
  await expect(page.getByRole('heading', { name: 'Triage' })).toBeVisible();
  await expect(page.getByText(/keep or park/i)).toBeVisible();
});

test('None option gives a list with no peek strip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles(
    'input[type=file]',
    path.join(__dirname, 'fixtures/sample-with-exercises.json'),
  );

  await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox').first().selectOption({ label: 'E2E Exercise Deck' });
  // Leave exercise picker at default "None"
  await page.getByPlaceholder(/shortlist/i).fill('Plain List');
  await page.getByRole('button', { name: /^create$/i }).click();

  await expect(page).toHaveURL(/\/lists\/[^/]+$/);
  await expect(page.getByRole('button', { name: /view guide/i })).toHaveCount(0);
});
```

- [ ] **Step 3:** Run the e2e tests.

Run: `npm run test:e2e -- exercises.spec.ts`
Expected: both tests pass.

- [ ] **Step 4:** Run the full e2e suite to catch any regressions.

Run: `npm run test:e2e`
Expected: all pass (existing golden.spec.ts etc.).

- [ ] **Step 5:** Commit.

```bash
git add tests/e2e/exercises.spec.ts tests/e2e/fixtures/sample-with-exercises.json
git commit -m "test: e2e coverage for exercise creation + companion"
```

---

## Task 15: Manual verification and final commit

- [ ] **Step 1:** Full typecheck + full test suite.

Run: `npm run lint && npm test && npm run test:e2e`
Expected: all pass.

- [ ] **Step 2:** Manual UI verification at `http://localhost:5173`. Walk this path end-to-end in the running app:

1. Import `public/sample-deck.json`. Toast confirms import.
2. Go to Lists → New list → pick the deck → picker shows Priority Planner + Keep/Maybe/Park + None.
3. Pick Priority Planner → name auto-fills to "Priority Planner", preview line shows `Seeds 5 groups: This Week · This Month · This Year · Next Five Years · Over a Lifetime`.
4. Create → land on list view → 5 empty seeded groups in correct order → peek strip at bottom reads `Priority Planner — View guide →`.
5. Tap the peek strip → expanded sheet opens with full markdown instructions rendered → Template section shows the original 5 labels.
6. Close the sheet → peek strip still there → rename the first group to "Soon" → reopen the sheet → Template still shows "This Week" (original label).
7. Go back to Lists → list row shows `PRIORITY PLANNER` badge.
8. Tap the deck in Decks → deck detail sheet shows `2 exercises` chip and the picker in the create form.
9. Create a second list with `None` → no peek strip on that list.
10. On a narrow viewport (DevTools device mode), confirm the peek strip sits above BottomTabs and does not overlap content. On a wide viewport, confirm it docks on the right.

If any behavior diverges from the spec, note it and fix before proceeding. If a visual layout feels off but behavior is correct, acceptable — create a follow-up note rather than rewriting.

- [ ] **Step 3:** Review uncommitted files.

Run: `git status --short`
Expected: clean, or only expected/planned residues.

- [ ] **Step 4:** Push the branch.

```bash
git push -u origin feat/deck-exercises
```

- [ ] **Step 5:** Open a PR.

Use `gh pr create` with a clear summary that references the spec. Do not merge.

---

## Summary of Commits

Expected commit sequence on `feat/deck-exercises`:

1. `feat: add Exercise type and bump schema to v2`
2. `feat: add markdownLite renderer with XSS-safe subset`
3. `feat: parse and validate exercises in importer`
4. `feat: forward exercises from importer into stored deck`
5. `feat: seed list groups from exercise template in createList`
6. `feat: add per-list exercise sheet open state`
7. `feat: ExerciseSheet renders instructions and template`
8. `feat: ExercisePeekStrip opens sheet via tap`
9. `feat: render exercise peek + sheet inside ListScreen`
10. `feat: exercise picker in new-list dialog`
11. `feat: show exercise name on lists index rows`
12. `feat: exercise picker + count chip on deck detail sheet`
13. `feat: add two exercises to bundled sample deck`
14. `test: e2e coverage for exercise creation + companion`

Plus the initial spec commit (`Add deck-exercises design spec`) already on the branch.
