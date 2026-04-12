# Deck Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, client-side card-deck web app (Deck Studio) that imports JSON decks, creates named lists with groups, supports drag-reorder, show/hide, shuffle, draw, Tinder-style swipe review, and one-way Markdown export.

**Architecture:** Vite + React 18 + TypeScript SPA, no backend. Zustand state with `persist` middleware on IndexedDB (`idb-keyval` adapter). shadcn/ui + Tailwind for UI, `@dnd-kit/sortable` for reorder, `framer-motion` for swipe, `react-router-dom` v6 for navigation, `sonner` for toasts. Mobile-first responsive layout, bottom-tab shell.

**Tech Stack:** Vite, TypeScript, React 18, Tailwind CSS, shadcn/ui (Radix primitives), Zustand, idb-keyval, react-router-dom, @dnd-kit, framer-motion, sonner, lucide-react, Vitest, React Testing Library, Playwright.

**Related spec:** `docs/superpowers/specs/2026-04-12-card-deck-app-design.md`

---

## File Structure (target)

```
deck-studio/
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json / tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json
├── playwright.config.ts
├── public/
│   ├── favicon.svg
│   └── sample-deck.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── screens/
│   │   ├── DecksScreen.tsx
│   │   ├── DeckConfigureScreen.tsx
│   │   ├── ListsScreen.tsx
│   │   └── ListScreen.tsx
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── BottomTabs.tsx
│   │   ├── CardView.tsx
│   │   ├── SortableCard.tsx
│   │   ├── SwipeCard.tsx
│   │   ├── GroupHeader.tsx
│   │   ├── HiddenCardsSheet.tsx
│   │   ├── CardDetailSheet.tsx
│   │   ├── DrawCardDialog.tsx
│   │   ├── ImportDeckButton.tsx
│   │   ├── FieldMappingEditor.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ListMenu.tsx
│   │   └── ui/              # shadcn components
│   ├── store/
│   │   ├── index.ts
│   │   ├── decksSlice.ts
│   │   ├── listsSlice.ts
│   │   ├── uiSlice.ts
│   │   ├── persistence.ts
│   │   └── migrations.ts
│   ├── lib/
│   │   ├── types.ts
│   │   ├── importer.ts
│   │   ├── markdownExporter.ts
│   │   ├── shuffle.ts
│   │   ├── uuid.ts
│   │   ├── cardFields.ts
│   │   └── download.ts
│   ├── hooks/
│   │   ├── useList.ts
│   │   ├── useDeck.ts
│   │   └── useToastUndo.ts
│   └── styles/
│       └── index.css
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
└── docs/
```

---

## Task 1: Scaffold project (Vite + TS + Tailwind + shadcn/ui + Vitest + Playwright)

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `playwright.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`
- Create: `tests/unit/.gitkeep`, `tests/component/.gitkeep`, `tests/e2e/.gitkeep`, `public/favicon.svg`

- [ ] **Step 1: Scaffold Vite React TS**

Run from `~/projects/deck-studio`:

```bash
npm create vite@latest . -- --template react-ts
# Answer "y" to ignore existing files
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install react-router-dom zustand idb-keyval \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  framer-motion sonner lucide-react \
  class-variance-authority clsx tailwind-merge \
  @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-tabs \
  @radix-ui/react-toast uuid
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D tailwindcss postcss autoprefixer \
  vitest @vitest/ui @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom happy-dom \
  @playwright/test @types/uuid
```

- [ ] **Step 4: Init Tailwind**

```bash
npx tailwindcss init -p
```

Replace `tailwind.config.js` contents (or rename to `tailwind.config.ts`) with:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Configure shadcn/ui (manual — no init wizard to keep deterministic)**

Create `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 6: Set up path alias and global styles**

Edit `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

Edit `tsconfig.json` — add under `compilerOptions`:

```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

Replace `src/styles/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --ring: 215 20.2% 65.1%;
    --radius: 0.5rem;
  }
  html, body, #root { height: 100%; }
  body { @apply bg-background text-foreground antialiased; }
}
```

- [ ] **Step 7: Create `src/lib/utils.ts` (shadcn helper)**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 8: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "lint": "tsc -b --noEmit"
}
```

- [ ] **Step 9: Configure Playwright**

```bash
npx playwright install --with-deps chromium
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

- [ ] **Step 10: Replace starter `App.tsx` with a placeholder and verify dev server**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">Deck Studio</h1>
    </main>
  );
}
```

Run `npm run dev`. Visit the URL. Confirm page renders "Deck Studio" with Tailwind styling applied. Kill the server.

Run `npm run lint`. Expected: exits 0.
Run `npm run test`. Expected: "No test files found" (or similar clean exit).
Run `npm run build`. Expected: succeeds with `dist/` output.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Scaffold Vite + React + TS with Tailwind, shadcn/ui, Vitest, Playwright"
```

---

## Task 2: Core types, UUID, shuffle, and card-field resolver

**Files:**
- Create: `src/lib/types.ts`, `src/lib/uuid.ts`, `src/lib/shuffle.ts`, `src/lib/cardFields.ts`
- Test: `tests/unit/shuffle.test.ts`, `tests/unit/cardFields.test.ts`

- [ ] **Step 1: Write failing tests for `shuffle`**

Create `tests/unit/shuffle.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- shuffle`
Expected: FAIL — `shuffle` not defined.

- [ ] **Step 3: Implement `shuffle`**

Create `src/lib/shuffle.ts`:

```ts
/** Fisher-Yates shuffle. Returns a new array; does not mutate input. */
export function shuffle<T>(input: readonly T[]): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- shuffle`
Expected: 5/5 PASS.

- [ ] **Step 5: Create `src/lib/uuid.ts`**

```ts
import { v4 } from 'uuid';
export const uuid = (): string => v4();
```

- [ ] **Step 6: Create `src/lib/types.ts`**

```ts
export type GroupColor = 'slate' | 'rose' | 'amber' | 'emerald' | 'sky' | 'violet';

export type FieldMapping = {
  title: string;
  subtitle?: string;
  body?: string;
  image?: string;
  meta?: string[];
};

export type Card = {
  id: string;
  fields: Record<string, unknown>;
};

export type Deck = {
  id: string;
  name: string;
  importedAt: string;
  fieldMapping: FieldMapping;
  cards: Card[];
};

export type Group = {
  id: string;
  name: string;
  color: GroupColor;
};

export type CardRef = {
  cardId: string;
  hidden: boolean;
  groupId: string | null;
};

export type List = {
  id: string;
  name: string;
  deckId: string;
  createdAt: string;
  updatedAt: string;
  groups: Group[];
  cardRefs: CardRef[];
};

export type ResolvedCard = {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  image?: string;
  meta: Array<{ key: string; value: string }>;
};
```

- [ ] **Step 7: Write failing tests for `cardFields` resolver**

Create `tests/unit/cardFields.test.ts`:

```ts
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
```

- [ ] **Step 8: Run tests, confirm failure**

Run: `npm test -- cardFields`
Expected: FAIL.

- [ ] **Step 9: Implement `cardFields`**

Create `src/lib/cardFields.ts`:

```ts
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
```

- [ ] **Step 10: Run tests, confirm pass**

Run: `npm test`
Expected: all unit tests pass (shuffle + cardFields).

- [ ] **Step 11: Commit**

```bash
git add src/lib tests/unit
git commit -m "Add core types, uuid, shuffle, and card-field resolver with unit tests"
```

---

## Task 3: Deck JSON importer

**Files:**
- Create: `src/lib/importer.ts`
- Test: `tests/unit/importer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/importer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- importer`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `importer.ts`**

Create `src/lib/importer.ts`:

```ts
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
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- importer`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/importer.ts tests/unit/importer.test.ts
git commit -m "Add deck JSON importer with shape detection, dedupe, and error paths"
```

---

## Task 4: Markdown exporter

**Files:**
- Create: `src/lib/markdownExporter.ts`
- Test: `tests/unit/markdownExporter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/markdownExporter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { exportListToMarkdown } from '@/lib/markdownExporter';
import type { Deck, List } from '@/lib/types';

const deck: Deck = {
  id: 'd1',
  name: 'Prompts',
  importedAt: '2026-04-01T00:00:00Z',
  fieldMapping: { title: 't', body: 'b' },
  cards: [
    { id: 'c1', fields: { t: 'Alpha', b: 'alpha body' } },
    { id: 'c2', fields: { t: 'Beta' } },
    { id: 'c3', fields: { t: 'Gamma', b: 'gamma body' } },
  ],
};

const baseList: List = {
  id: 'l1',
  name: 'My List',
  deckId: 'd1',
  createdAt: '2026-04-12T10:00:00Z',
  updatedAt: '2026-04-12T10:00:00Z',
  groups: [{ id: 'g1', name: 'Warm-ups', color: 'slate' }],
  cardRefs: [
    { cardId: 'c1', hidden: false, groupId: 'g1' },
    { cardId: 'c2', hidden: false, groupId: null },
    { cardId: 'c3', hidden: true, groupId: null },
  ],
};

describe('exportListToMarkdown', () => {
  it('renders list name as H1 with deck blockquote', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('# My List');
    expect(md).toContain('> From deck: *Prompts* · 2026-04-12');
  });

  it('renders groups as H2 in order', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('## Warm-ups');
    expect(md).toContain('## (Ungrouped)');
    expect(md.indexOf('## Warm-ups')).toBeLessThan(md.indexOf('## (Ungrouped)'));
  });

  it('renders titles bold and body on indented next line', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('- **Alpha**\n  alpha body');
  });

  it('omits body line when body is unmapped or empty', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('- **Beta**');
    expect(md).not.toMatch(/\*\*Beta\*\*\n {2}\S/);
  });

  it('excludes hidden cards', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).not.toContain('Gamma');
  });

  it('omits ungrouped section when it has no visible cards', () => {
    const list: List = {
      ...baseList,
      cardRefs: [{ cardId: 'c1', hidden: false, groupId: 'g1' }],
    };
    const md = exportListToMarkdown(list, deck, '2026-04-12');
    expect(md).not.toContain('## (Ungrouped)');
  });

  it('renders a No cards placeholder for an empty list', () => {
    const list: List = { ...baseList, cardRefs: [] };
    const md = exportListToMarkdown(list, deck, '2026-04-12');
    expect(md).toContain('*No cards yet*');
  });

  it('renders Missing card for unresolved refs and excludes them from output body', () => {
    const list: List = {
      ...baseList,
      cardRefs: [{ cardId: 'missing', hidden: false, groupId: null }],
    };
    const md = exportListToMarkdown(list, deck, '2026-04-12');
    expect(md).toContain('*No cards yet*');
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- markdownExporter`
Expected: FAIL.

- [ ] **Step 3: Implement exporter**

Create `src/lib/markdownExporter.ts`:

```ts
import type { Deck, List } from './types';
import { resolveCard } from './cardFields';

export function exportListToMarkdown(list: List, deck: Deck, today: string): string {
  const cardById = new Map(deck.cards.map((c) => [c.id, c]));
  const visibleRefs = list.cardRefs.filter((r) => !r.hidden && cardById.has(r.cardId));

  const lines: string[] = [];
  lines.push(`# ${list.name}`);
  lines.push('');
  lines.push(`> From deck: *${deck.name}* · ${today}`);
  lines.push('');

  if (visibleRefs.length === 0) {
    lines.push('*No cards yet*');
    return lines.join('\n') + '\n';
  }

  const renderCard = (cardId: string) => {
    const card = cardById.get(cardId)!;
    const r = resolveCard(card, deck.fieldMapping);
    const out = [`- **${r.title}**`];
    if (r.body) out.push(`  ${r.body}`);
    return out.join('\n');
  };

  for (const group of list.groups) {
    const refs = visibleRefs.filter((r) => r.groupId === group.id);
    if (!refs.length) continue;
    lines.push(`## ${group.name}`);
    for (const r of refs) lines.push(renderCard(r.cardId));
    lines.push('');
  }

  const ungrouped = visibleRefs.filter((r) => r.groupId === null);
  if (ungrouped.length) {
    lines.push('## (Ungrouped)');
    for (const r of ungrouped) lines.push(renderCard(r.cardId));
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- markdownExporter`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/markdownExporter.ts tests/unit/markdownExporter.test.ts
git commit -m "Add markdown exporter with group ordering, hidden exclusion, and empty state"
```

---

## Task 5: Persistence adapter (idb-keyval ↔ Zustand persist)

**Files:**
- Create: `src/store/persistence.ts`, `src/store/migrations.ts`
- Test: `tests/unit/persistence.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/persistence.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { idbStorage } from '@/store/persistence';

// idb-keyval uses indexedDB which jsdom does not ship; use fake-indexeddb
import 'fake-indexeddb/auto';

describe('idbStorage', () => {
  beforeEach(async () => {
    await idbStorage.removeItem('deck-studio:state');
  });

  it('stores and retrieves JSON strings', async () => {
    await idbStorage.setItem('deck-studio:state', JSON.stringify({ a: 1 }));
    const read = await idbStorage.getItem('deck-studio:state');
    expect(read).toBe('{"a":1}');
  });

  it('returns null for missing keys', async () => {
    expect(await idbStorage.getItem('missing')).toBeNull();
  });

  it('removes keys', async () => {
    await idbStorage.setItem('x', '1');
    await idbStorage.removeItem('x');
    expect(await idbStorage.getItem('x')).toBeNull();
  });
});
```

- [ ] **Step 2: Install test dep**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 3: Run tests, confirm failure**

Run: `npm test -- persistence`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement persistence adapter**

Create `src/store/persistence.ts`:

```ts
import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

export const idbStorage: StateStorage = {
  async getItem(name) {
    const v = await get(name);
    return typeof v === 'string' ? v : null;
  },
  async setItem(name, value) {
    await set(name, value);
  },
  async removeItem(name) {
    await del(name);
  },
};
```

Create `src/store/migrations.ts`:

```ts
export const CURRENT_VERSION = 1;

export function migrate(state: unknown, version: number): unknown {
  // v1: no migrations yet; scaffold for future versions.
  if (version === CURRENT_VERSION) return state;
  return state;
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm test -- persistence`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/store tests/unit/persistence.test.ts package.json package-lock.json
git commit -m "Add IndexedDB persistence adapter for Zustand with migration scaffold"
```

---

## Task 6: Zustand store with slices and actions

**Files:**
- Create: `src/store/index.ts`, `src/store/decksSlice.ts`, `src/store/listsSlice.ts`, `src/store/uiSlice.ts`
- Test: `tests/unit/store.test.ts`

- [ ] **Step 1: Write failing tests** (behavior-level, not internals)

Create `tests/unit/store.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { useAppStore } from '@/store';
import type { Deck } from '@/lib/types';

const sampleDeck: Omit<Deck, 'id' | 'importedAt'> = {
  name: 'D1',
  fieldMapping: { title: 't' },
  cards: [
    { id: 'c1', fields: { t: 'A' } },
    { id: 'c2', fields: { t: 'B' } },
    { id: 'c3', fields: { t: 'C' } },
  ],
};

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('store', () => {
  beforeEach(() => reset());

  it('adds and lists a deck', () => {
    const id = useAppStore.getState().addDeck(sampleDeck);
    const deck = useAppStore.getState().decks[id];
    expect(deck.name).toBe('D1');
    expect(deck.id).toBe(id);
  });

  it('creates a list with one CardRef per deck card, ungrouped, visible', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'My List');
    const list = useAppStore.getState().lists[listId];
    expect(list.cardRefs).toHaveLength(3);
    expect(list.cardRefs.every((r) => r.hidden === false && r.groupId === null)).toBe(true);
    expect(list.cardRefs.map((r) => r.cardId)).toEqual(['c1', 'c2', 'c3']);
    expect(list.groups).toEqual([]);
  });

  it('reorders cardRefs within a list', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().reorderCards(listId, 0, 2);
    const ids = useAppStore.getState().lists[listId].cardRefs.map((r) => r.cardId);
    expect(ids).toEqual(['c2', 'c3', 'c1']);
  });

  it('toggles hidden flag', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setHidden(listId, 'c1', true);
    expect(useAppStore.getState().lists[listId].cardRefs[0].hidden).toBe(true);
  });

  it('adds, renames, recolors, and deletes groups', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    const gId = useAppStore.getState().addGroup(listId, 'Warmups');
    useAppStore.getState().renameGroup(listId, gId, 'Starters');
    useAppStore.getState().setGroupColor(listId, gId, 'rose');
    let list = useAppStore.getState().lists[listId];
    expect(list.groups[0]).toMatchObject({ name: 'Starters', color: 'rose' });
    useAppStore.getState().moveCardToGroup(listId, 'c1', gId);
    expect(useAppStore.getState().lists[listId].cardRefs[0].groupId).toBe(gId);
    useAppStore.getState().deleteGroup(listId, gId);
    list = useAppStore.getState().lists[listId];
    expect(list.groups).toHaveLength(0);
    expect(list.cardRefs[0].groupId).toBe(null);
  });

  it('shuffles cardRefs (still same length and same ids)', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().shuffleList(listId);
    const ids = useAppStore.getState().lists[listId].cardRefs.map((r) => r.cardId);
    expect(ids.sort()).toEqual(['c1', 'c2', 'c3']);
  });

  it('deleteDeck does NOT cascade-delete lists', () => {
    const deckId = useAppStore.getState().addDeck(sampleDeck);
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().deleteDeck(deckId);
    expect(useAppStore.getState().decks[deckId]).toBeUndefined();
    expect(useAppStore.getState().lists[listId]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `npm test -- store`
Expected: FAIL.

- [ ] **Step 3: Implement slices**

Create `src/store/decksSlice.ts`:

```ts
import type { StateCreator } from 'zustand';
import type { Deck, FieldMapping } from '@/lib/types';
import { uuid } from '@/lib/uuid';

export type DecksSlice = {
  decks: Record<string, Deck>;
  addDeck: (input: Omit<Deck, 'id' | 'importedAt'>) => string;
  updateDeckMapping: (deckId: string, mapping: FieldMapping) => void;
  renameDeck: (deckId: string, name: string) => void;
  deleteDeck: (deckId: string) => void;
};

export const createDecksSlice: StateCreator<DecksSlice, [], [], DecksSlice> = (set) => ({
  decks: {},
  addDeck: (input) => {
    const id = uuid();
    const deck: Deck = { ...input, id, importedAt: new Date().toISOString() };
    set((s) => ({ decks: { ...s.decks, [id]: deck } }));
    return id;
  },
  updateDeckMapping: (deckId, mapping) =>
    set((s) => ({
      decks: {
        ...s.decks,
        [deckId]: { ...s.decks[deckId], fieldMapping: mapping },
      },
    })),
  renameDeck: (deckId, name) =>
    set((s) => ({ decks: { ...s.decks, [deckId]: { ...s.decks[deckId], name } } })),
  deleteDeck: (deckId) =>
    set((s) => {
      const rest = { ...s.decks };
      delete rest[deckId];
      return { decks: rest };
    }),
});
```

Create `src/store/listsSlice.ts`:

```ts
import type { StateCreator } from 'zustand';
import type { CardRef, Group, GroupColor, List } from '@/lib/types';
import { uuid } from '@/lib/uuid';
import { shuffle } from '@/lib/shuffle';

export type ListsSlice = {
  lists: Record<string, List>;
  createList: (deckId: string, name: string) => string;
  renameList: (listId: string, name: string) => void;
  duplicateList: (listId: string) => string;
  deleteList: (listId: string) => void;

  reorderCards: (listId: string, fromIndex: number, toIndex: number) => void;
  setHidden: (listId: string, cardId: string, hidden: boolean) => void;
  restoreAllHidden: (listId: string) => void;
  removeCard: (listId: string, cardId: string) => void;

  addGroup: (listId: string, name: string) => string;
  renameGroup: (listId: string, groupId: string, name: string) => void;
  setGroupColor: (listId: string, groupId: string, color: GroupColor) => void;
  deleteGroup: (listId: string, groupId: string) => void;
  reorderGroups: (listId: string, fromIndex: number, toIndex: number) => void;
  clearAllGroups: (listId: string) => void;

  moveCardToGroup: (listId: string, cardId: string, groupId: string | null) => void;
  moveCardToGroupAt: (
    listId: string,
    cardId: string,
    targetGroupId: string | null,
    insertIndexInGroup: number
  ) => void;

  shuffleList: (listId: string) => void;
  setCardRefs: (listId: string, cardRefs: CardRef[]) => void;
};

const touch = (list: List): List => ({ ...list, updatedAt: new Date().toISOString() });

const withList =
  (listId: string, updater: (list: List) => List) =>
  (s: { lists: Record<string, List> }) => {
    const list = s.lists[listId];
    if (!list) return s;
    return { ...s, lists: { ...s.lists, [listId]: touch(updater(list)) } };
  };

export const createListsSlice: StateCreator<
  ListsSlice & { decks: Record<string, import('@/lib/types').Deck> },
  [],
  [],
  ListsSlice
> = (set, get) => ({
  lists: {},

  createList: (deckId, name) => {
    const deck = get().decks[deckId];
    if (!deck) throw new Error(`Deck ${deckId} not found`);
    const id = uuid();
    const now = new Date().toISOString();
    const list: List = {
      id,
      name,
      deckId,
      createdAt: now,
      updatedAt: now,
      groups: [],
      cardRefs: deck.cards.map((c) => ({ cardId: c.id, hidden: false, groupId: null })),
    };
    set((s) => ({ lists: { ...s.lists, [id]: list } }));
    return id;
  },

  renameList: (listId, name) => set(withList(listId, (l) => ({ ...l, name }))),

  duplicateList: (listId) => {
    const src = get().lists[listId];
    if (!src) return listId;
    const newId = uuid();
    const now = new Date().toISOString();
    const copy: List = {
      ...src,
      id: newId,
      name: `${src.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ lists: { ...s.lists, [newId]: copy } }));
    return newId;
  },

  deleteList: (listId) =>
    set((s) => {
      const rest = { ...s.lists };
      delete rest[listId];
      return { lists: rest };
    }),

  reorderCards: (listId, fromIndex, toIndex) =>
    set(
      withList(listId, (l) => {
        if (fromIndex === toIndex) return l;
        const next = l.cardRefs.slice();
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return { ...l, cardRefs: next };
      })
    ),

  setHidden: (listId, cardId, hidden) =>
    set(
      withList(listId, (l) => ({
        ...l,
        cardRefs: l.cardRefs.map((r) => (r.cardId === cardId ? { ...r, hidden } : r)),
      }))
    ),

  restoreAllHidden: (listId) =>
    set(withList(listId, (l) => ({
      ...l,
      cardRefs: l.cardRefs.map((r) => ({ ...r, hidden: false })),
    }))),

  removeCard: (listId, cardId) =>
    set(withList(listId, (l) => ({
      ...l,
      cardRefs: l.cardRefs.filter((r) => r.cardId !== cardId),
    }))),

  addGroup: (listId, name) => {
    const id = uuid();
    const group: Group = { id, name, color: 'slate' };
    set(withList(listId, (l) => ({ ...l, groups: [...l.groups, group] })));
    return id;
  },

  renameGroup: (listId, groupId, name) =>
    set(withList(listId, (l) => ({
      ...l,
      groups: l.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
    }))),

  setGroupColor: (listId, groupId, color) =>
    set(withList(listId, (l) => ({
      ...l,
      groups: l.groups.map((g) => (g.id === groupId ? { ...g, color } : g)),
    }))),

  deleteGroup: (listId, groupId) =>
    set(withList(listId, (l) => ({
      ...l,
      groups: l.groups.filter((g) => g.id !== groupId),
      cardRefs: l.cardRefs.map((r) => (r.groupId === groupId ? { ...r, groupId: null } : r)),
    }))),

  reorderGroups: (listId, fromIndex, toIndex) =>
    set(withList(listId, (l) => {
      if (fromIndex === toIndex) return l;
      const next = l.groups.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...l, groups: next };
    })),

  clearAllGroups: (listId) =>
    set(withList(listId, (l) => ({
      ...l,
      groups: [],
      cardRefs: l.cardRefs.map((r) => ({ ...r, groupId: null })),
    }))),

  moveCardToGroup: (listId, cardId, groupId) =>
    set(withList(listId, (l) => ({
      ...l,
      cardRefs: l.cardRefs.map((r) => (r.cardId === cardId ? { ...r, groupId } : r)),
    }))),

  moveCardToGroupAt: (listId, cardId, targetGroupId, insertIndexInGroup) =>
    set(withList(listId, (l) => {
      const without = l.cardRefs.filter((r) => r.cardId !== cardId);
      const original = l.cardRefs.find((r) => r.cardId === cardId);
      if (!original) return l;
      const updated: CardRef = { ...original, groupId: targetGroupId };
      const groupRefs = without
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.groupId === targetGroupId);
      const targetGlobalIndex =
        insertIndexInGroup >= groupRefs.length
          ? without.length
          : groupRefs[insertIndexInGroup].i;
      const next = without.slice();
      next.splice(targetGlobalIndex, 0, updated);
      return { ...l, cardRefs: next };
    })),

  shuffleList: (listId) =>
    set(withList(listId, (l) => ({ ...l, cardRefs: shuffle(l.cardRefs) }))),

  setCardRefs: (listId, cardRefs) =>
    set(withList(listId, (l) => ({ ...l, cardRefs }))),
});
```

Create `src/store/uiSlice.ts`:

```ts
import type { StateCreator } from 'zustand';

export type ListMode = 'view' | 'swipe';

export type UISlice = {
  ui: {
    collapsedGroups: Record<string, boolean>;       // keyed by groupId
    hiddenSheetOpen: boolean;
    drawCardOpen: boolean;
    activeCardDetail: { listId: string; cardId: string } | null;
  };
  toggleGroupCollapsed: (groupId: string) => void;
  setHiddenSheetOpen: (open: boolean) => void;
  setDrawCardOpen: (open: boolean) => void;
  setCardDetail: (value: UISlice['ui']['activeCardDetail']) => void;
};

export const createUiSlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  ui: {
    collapsedGroups: {},
    hiddenSheetOpen: false,
    drawCardOpen: false,
    activeCardDetail: null,
  },
  toggleGroupCollapsed: (groupId) =>
    set((s) => ({
      ui: {
        ...s.ui,
        collapsedGroups: { ...s.ui.collapsedGroups, [groupId]: !s.ui.collapsedGroups[groupId] },
      },
    })),
  setHiddenSheetOpen: (open) => set((s) => ({ ui: { ...s.ui, hiddenSheetOpen: open } })),
  setDrawCardOpen: (open) => set((s) => ({ ui: { ...s.ui, drawCardOpen: open } })),
  setCardDetail: (value) => set((s) => ({ ui: { ...s.ui, activeCardDetail: value } })),
});
```

Create `src/store/index.ts`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createDecksSlice, type DecksSlice } from './decksSlice';
import { createListsSlice, type ListsSlice } from './listsSlice';
import { createUiSlice, type UISlice } from './uiSlice';
import { idbStorage } from './persistence';
import { CURRENT_VERSION, migrate } from './migrations';

export type AppState = DecksSlice & ListsSlice & UISlice;

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createDecksSlice(...a),
      ...createListsSlice(...a),
      ...createUiSlice(...a),
    }),
    {
      name: 'deck-studio:state',
      version: CURRENT_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ decks: s.decks, lists: s.lists }),
      migrate: (state, version) => migrate(state, version) as AppState,
    }
  )
);
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- store`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/store tests/unit/store.test.ts
git commit -m "Add Zustand store with decks/lists/ui slices and persist middleware"
```

---

## Task 7: Router, app shell, and bottom tabs

**Files:**
- Create: `src/router.tsx`, `src/components/AppShell.tsx`, `src/components/BottomTabs.tsx`, `src/components/ui/button.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Create (screen stubs): `src/screens/DecksScreen.tsx`, `src/screens/ListsScreen.tsx`
- Test: `tests/component/AppShell.test.tsx`

- [ ] **Step 1: Add shadcn Button component**

Create `src/components/ui/button.tsx`:

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-muted',
        outline: 'border border-input bg-transparent hover:bg-muted',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-sm',
        lg: 'h-12 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = 'Button';
```

- [ ] **Step 2: Create screen stubs**

`src/screens/DecksScreen.tsx`:
```tsx
export default function DecksScreen() {
  return <div className="p-6"><h2 className="text-xl font-semibold">Decks</h2></div>;
}
```

`src/screens/ListsScreen.tsx`:
```tsx
export default function ListsScreen() {
  return <div className="p-6"><h2 className="text-xl font-semibold">Lists</h2></div>;
}
```

- [ ] **Step 3: Create `BottomTabs.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { Layers, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/decks', label: 'Decks', icon: Layers },
  { to: '/lists', label: 'Lists', icon: ListChecks },
];

export function BottomTabs() {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-10 grid grid-cols-2 border-t bg-background md:static md:grid-cols-[auto_auto] md:justify-start md:gap-2 md:border-t-0 md:border-b md:px-4 md:py-2"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium md:flex-row md:px-3 md:py-1 md:text-sm',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Create `AppShell.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
```

- [ ] **Step 5: Create `router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import DecksScreen from '@/screens/DecksScreen';
import ListsScreen from '@/screens/ListsScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/decks" replace /> },
      { path: 'decks', element: <DecksScreen /> },
      { path: 'lists', element: <ListsScreen /> },
    ],
  },
]);
```

- [ ] **Step 6: Wire router into `App.tsx` / `main.tsx`**

`src/App.tsx`:
```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </>
  );
}
```

Ensure `src/main.tsx` imports `./styles/index.css`.

- [ ] **Step 7: Write component test for shell + tabs**

Create `tests/component/AppShell.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import DecksScreen from '@/screens/DecksScreen';
import ListsScreen from '@/screens/ListsScreen';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/decks" replace />} />
          <Route path="decks" element={<DecksScreen />} />
          <Route path="lists" element={<ListsScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('AppShell', () => {
  it('renders Decks and Lists tabs', () => {
    renderAt('/decks');
    expect(screen.getByRole('link', { name: /decks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lists/i })).toBeInTheDocument();
  });

  it('renders the Decks screen at /decks', () => {
    renderAt('/decks');
    expect(screen.getByRole('heading', { name: /decks/i })).toBeInTheDocument();
  });

  it('renders the Lists screen at /lists', () => {
    renderAt('/lists');
    expect(screen.getByRole('heading', { name: /lists/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run all tests, confirm pass; run dev server and verify visually**

Run: `npm test`
Expected: all green.

Run: `npm run dev`, visit the app, confirm the two tabs render, both routes work. Kill server.

- [ ] **Step 9: Commit**

```bash
git add src/router.tsx src/components src/screens src/App.tsx tests/component/AppShell.test.tsx
git commit -m "Add router, app shell, and bottom-tab navigation with decks/lists screens"
```

---

## Task 8: Decks screen — list decks, import button, empty state, sample deck

**Files:**
- Create: `src/components/EmptyState.tsx`, `src/components/ImportDeckButton.tsx`, `src/components/ui/dialog.tsx`, `public/sample-deck.json`
- Modify: `src/screens/DecksScreen.tsx`
- Test: `tests/component/DecksScreen.test.tsx`

- [ ] **Step 1: Add shadcn Dialog primitive**

Create `src/components/ui/dialog.tsx` with the standard shadcn Dialog exports (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`). Use the canonical shadcn implementation verbatim from https://ui.shadcn.com/docs/components/dialog — it relies only on `@radix-ui/react-dialog`, `lucide-react`, and `cn` from `@/lib/utils`.

- [ ] **Step 2: Create `EmptyState.tsx`**

```tsx
import { ReactNode } from 'react';

type Props = { title: string; body?: string; action?: ReactNode };

export function EmptyState({ title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {body && <p className="max-w-sm">{body}</p>}
      {action}
    </div>
  );
}
```

- [ ] **Step 3: Create `ImportDeckButton.tsx`**

```tsx
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { parseDeck, ImportError } from '@/lib/importer';
import { useAppStore } from '@/store';

export function ImportDeckButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const addDeck = useAppStore((s) => s.addDeck);
  const navigate = useNavigate();

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseDeck(text, file.name);
      const id = addDeck({
        name: parsed.name,
        fieldMapping: parsed.fieldMapping,
        cards: parsed.cards,
      });
      if (parsed.warnings.includes('duplicate_ids')) {
        toast.warning('Some duplicate card IDs were removed.');
      }
      if (parsed.skippedMapping) {
        toast.success(`Imported "${parsed.name}" (${parsed.cards.length} cards)`);
        navigate('/decks');
      } else {
        if (parsed.warnings.includes('preconfigured_title_unresolved')) {
          toast.warning('Pre-configured title field was not found; please map it.');
        }
        navigate(`/decks/${id}/configure`);
      }
    } catch (err) {
      if (err instanceof ImportError) {
        toast.error(err.message);
      } else {
        toast.error("Couldn't save deck. Storage may be full.");
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <Button onClick={() => inputRef.current?.click()}>+ Import deck</Button>
    </>
  );
}
```

- [ ] **Step 4: Create `public/sample-deck.json`**

```json
{
  "name": "Oblique Strategies (sample)",
  "fieldMapping": { "title": "prompt" },
  "cards": [
    { "id": "1", "prompt": "Use an old idea." },
    { "id": "2", "prompt": "Honor thy error as a hidden intention." },
    { "id": "3", "prompt": "Ask your body." },
    { "id": "4", "prompt": "Take a break." },
    { "id": "5", "prompt": "Repetition is a form of change." }
  ]
}
```

- [ ] **Step 5: Implement `DecksScreen.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store';
import { EmptyState } from '@/components/EmptyState';
import { ImportDeckButton } from '@/components/ImportDeckButton';

export default function DecksScreen() {
  const decks = useAppStore((s) => Object.values(s.decks));
  return (
    <div className="p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Decks</h2>
        <ImportDeckButton />
      </header>

      {decks.length === 0 ? (
        <EmptyState
          title="No decks yet"
          body="Import a deck to get started. Try the sample:"
          action={
            <a className="underline" href="/sample-deck.json" download>
              Download sample deck
            </a>
          }
        />
      ) : (
        <ul className="mt-4 divide-y rounded-md border">
          {decks.map((d) => (
            <li key={d.id}>
              <Link to={`/decks/${d.id}`} className="flex items-center justify-between p-3 hover:bg-muted">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">
                  {d.cards.length} cards · {new Date(d.importedAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write component test**

Create `tests/component/DecksScreen.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DecksScreen from '@/screens/DecksScreen';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState(
    (s) => ({ ...s, decks: {}, lists: {} }),
    true as unknown as false
  );

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/decks']}>
      <Routes>
        <Route path="/decks" element={<DecksScreen />} />
        <Route path="/decks/:id/configure" element={<div>Configure</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('DecksScreen', () => {
  beforeEach(() => reset());

  it('shows empty state when no decks', () => {
    renderScreen();
    expect(screen.getByText(/No decks yet/i)).toBeInTheDocument();
  });

  it('lists existing decks', () => {
    useAppStore.getState().addDeck({
      name: 'Test',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'a' } }],
    });
    renderScreen();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText(/1 cards/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run tests, confirm pass; verify dev server renders deck list and empty state**

Run: `npm test`

Run: `npm run dev` and verify: empty state appears; clicking "+ Import deck" opens a file picker. Import the sample `public/sample-deck.json` — since it has pre-configured mapping, a toast confirms; list reappears with 1 deck.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add Decks screen with import flow, empty state, and sample deck"
```

---

## Task 9: Field mapping screen + deck detail sheet

**Files:**
- Create: `src/screens/DeckConfigureScreen.tsx`, `src/components/FieldMappingEditor.tsx`, `src/components/CardView.tsx`, `src/components/ui/select.tsx`, `src/components/ui/sheet.tsx`
- Modify: `src/router.tsx`, `src/screens/DecksScreen.tsx`
- Test: `tests/component/FieldMappingEditor.test.tsx`

- [ ] **Step 1: Add shadcn Select and Sheet primitives**

Pull the canonical shadcn implementations of `Select` (built on `@radix-ui/react-select`) and `Sheet` (built on `@radix-ui/react-dialog`) verbatim into `src/components/ui/select.tsx` and `src/components/ui/sheet.tsx`.

- [ ] **Step 2: Create `CardView.tsx`**

```tsx
import { Card as CardT, FieldMapping } from '@/lib/types';
import { resolveCard } from '@/lib/cardFields';

type Props = { card: CardT; mapping: FieldMapping; className?: string };

export function CardView({ card, mapping, className }: Props) {
  const r = resolveCard(card, mapping);
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${className ?? ''}`}>
      {r.image && <img src={r.image} alt="" className="mb-3 max-h-48 w-full rounded-md object-cover" />}
      <h3 className="text-lg font-semibold leading-tight">{r.title || <span className="italic text-muted-foreground">(no title)</span>}</h3>
      {r.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{r.subtitle}</p>}
      {r.body && <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>}
      {r.meta.length > 0 && (
        <dl className="mt-3 space-y-0.5 text-xs text-muted-foreground">
          {r.meta.map((m) => (
            <div key={m.key} className="flex gap-2">
              <dt className="font-medium">{m.key}:</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Create `FieldMappingEditor.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { CardView } from './CardView';
import type { Card, FieldMapping } from '@/lib/types';

type Props = {
  cards: Card[];
  detectedKeys: string[];
  initial: FieldMapping;
  onSave: (mapping: FieldMapping) => void;
};

export function FieldMappingEditor({ cards, detectedKeys, initial, onSave }: Props) {
  const [mapping, setMapping] = useState<FieldMapping>(initial);
  const sample = cards[0];
  const meta = mapping.meta ?? [];
  const canSave = Boolean(mapping.title);
  const roles: Array<{ role: keyof Omit<FieldMapping, 'meta'>; label: string; required?: boolean }> = useMemo(
    () => [
      { role: 'title', label: 'Title', required: true },
      { role: 'subtitle', label: 'Subtitle' },
      { role: 'body', label: 'Body' },
      { role: 'image', label: 'Image' },
    ],
    []
  );

  return (
    <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Map fields</h2>
        {roles.map(({ role, label, required }) => (
          <label key={role} className="flex items-center gap-3">
            <span className="w-20 text-sm font-medium">{label}{required ? ' *' : ''}</span>
            <select
              className="flex-1 rounded-md border bg-background p-2 text-sm"
              value={(mapping[role] as string) ?? ''}
              onChange={(e) =>
                setMapping((m) => ({ ...m, [role]: e.target.value || undefined }))
              }
            >
              <option value="">—</option>
              {detectedKeys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
        ))}
        <fieldset>
          <legend className="text-sm font-medium">Meta (multiple)</legend>
          <div className="mt-2 grid gap-1 md:grid-cols-2">
            {detectedKeys.map((k) => {
              const checked = meta.includes(k);
              const disabled =
                k === mapping.title || k === mapping.subtitle || k === mapping.body || k === mapping.image;
              return (
                <label key={k} className={`flex items-center gap-2 text-sm ${disabled ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={checked}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        meta: e.target.checked
                          ? [...(m.meta ?? []), k]
                          : (m.meta ?? []).filter((x) => x !== k),
                      }))
                    }
                  />
                  {k}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <Button disabled={!canSave} onClick={() => onSave(mapping)}>Save</Button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Preview</h3>
        {sample ? <CardView card={sample} mapping={mapping} /> : <p>No sample card available.</p>}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Create `DeckConfigureScreen.tsx`**

```tsx
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { FieldMappingEditor } from '@/components/FieldMappingEditor';
import type { FieldMapping } from '@/lib/types';

export default function DeckConfigureScreen() {
  const { deckId = '' } = useParams();
  const deck = useAppStore((s) => s.decks[deckId]);
  const updateMapping = useAppStore((s) => s.updateDeckMapping);
  const navigate = useNavigate();

  const detectedKeys = useMemo(
    () => (deck ? Array.from(new Set(deck.cards.flatMap((c) => Object.keys(c.fields)))).sort() : []),
    [deck]
  );

  if (!deck) {
    return <div className="p-6">Deck not found. <button className="underline" onClick={() => navigate('/decks')}>Go to Decks</button></div>;
  }

  const onSave = (mapping: FieldMapping) => {
    updateMapping(deckId, mapping);
    toast.success(`Saved mapping for "${deck.name}"`);
    navigate('/decks');
  };

  return (
    <FieldMappingEditor
      cards={deck.cards}
      detectedKeys={detectedKeys}
      initial={deck.fieldMapping}
      onSave={onSave}
    />
  );
}
```

- [ ] **Step 5: Add route to `router.tsx`**

Under the `children` array:

```tsx
{ path: 'decks/:deckId/configure', element: <DeckConfigureScreen /> },
```

And import at the top:

```tsx
import DeckConfigureScreen from '@/screens/DeckConfigureScreen';
```

- [ ] **Step 6: Write component test for FieldMappingEditor**

Create `tests/component/FieldMappingEditor.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldMappingEditor } from '@/components/FieldMappingEditor';

const cards = [{ id: 'c1', fields: { prompt: 'Hello', category: 'Warmup' } }];

describe('FieldMappingEditor', () => {
  it('disables save when no title is chosen', () => {
    render(
      <FieldMappingEditor
        cards={cards}
        detectedKeys={['prompt', 'category']}
        initial={{ title: '' }}
        onSave={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('enables save and calls onSave with chosen mapping', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FieldMappingEditor
        cards={cards}
        detectedKeys={['prompt', 'category']}
        initial={{ title: 'prompt' }}
        onSave={onSave}
      />
    );
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'prompt' }));
  });

  it('renders a preview using the current mapping', () => {
    render(
      <FieldMappingEditor
        cards={cards}
        detectedKeys={['prompt', 'category']}
        initial={{ title: 'prompt' }}
        onSave={() => {}}
      />
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run tests and dev server**

Run: `npm test`.
Run: `npm run dev` — import a deck without pre-configured mapping (a plain array JSON file) and verify you land on the configure screen with live preview.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add field-mapping screen with live preview and deck detail route"
```

---

## Task 10: Lists screen and new-list flow

**Files:**
- Create: `src/screens/ListsScreen.tsx` (overwrite stub), `src/components/ui/dropdown-menu.tsx`
- Modify: `src/router.tsx`
- Test: `tests/component/ListsScreen.test.tsx`

- [ ] **Step 1: Add shadcn DropdownMenu primitive**

Pull the canonical shadcn `DropdownMenu` implementation into `src/components/ui/dropdown-menu.tsx`.

- [ ] **Step 2: Implement `ListsScreen.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { useAppStore } from '@/store';

export default function ListsScreen() {
  const lists = useAppStore((s) => Object.values(s.lists).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  const decks = useAppStore((s) => Object.values(s.decks));
  const createList = useAppStore((s) => s.createList);
  const deleteList = useAppStore((s) => s.deleteList);
  const renameList = useAppStore((s) => s.renameList);
  const duplicateList = useAppStore((s) => s.duplicateList);
  const navigate = useNavigate();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDeckId, setWizardDeckId] = useState<string>('');
  const [wizardName, setWizardName] = useState('');

  const visibleCount = useMemo(() => {
    const counts: Record<string, { visible: number; total: number }> = {};
    for (const l of lists) {
      const total = l.cardRefs.length;
      const visible = l.cardRefs.filter((r) => !r.hidden).length;
      counts[l.id] = { visible, total };
    }
    return counts;
  }, [lists]);

  const onCreate = () => {
    if (!wizardDeckId || !wizardName.trim()) return;
    const id = createList(wizardDeckId, wizardName.trim());
    setWizardOpen(false);
    setWizardName('');
    navigate(`/lists/${id}`);
  };

  return (
    <div className="p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Lists</h2>
        <Button onClick={() => setWizardOpen(true)} disabled={decks.length === 0}>
          + New list
        </Button>
      </header>

      {lists.length === 0 ? (
        <EmptyState
          title="No lists yet"
          body={decks.length === 0 ? 'Import a deck first.' : 'Create a list from a deck.'}
        />
      ) : (
        <ul className="mt-4 divide-y rounded-md border">
          {lists.map((l) => {
            const deck = useAppStore.getState().decks[l.deckId];
            const c = visibleCount[l.id];
            return (
              <li key={l.id} className="flex items-center">
                <Link className="flex-1 p-3 hover:bg-muted" to={`/lists/${l.id}`}>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {deck?.name ?? 'Unknown deck'} · {c.visible}/{c.total} cards · {new Date(l.updatedAt).toLocaleDateString()}
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="List actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      const name = prompt('Rename list', l.name);
                      if (name && name.trim()) renameList(l.id, name.trim());
                    }}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateList(l.id)}>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => {
                      if (confirm(`Delete "${l.name}"?`)) deleteList(l.id);
                    }}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create a new list</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">Deck
              <select
                className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                value={wizardDeckId}
                onChange={(e) => setWizardDeckId(e.target.value)}
              >
                <option value="">Select a deck…</option>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Name
              <input
                className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                value={wizardName}
                onChange={(e) => setWizardName(e.target.value)}
                placeholder="My shortlist"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
            <Button onClick={onCreate} disabled={!wizardDeckId || !wizardName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Component test**

Create `tests/component/ListsScreen.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListsScreen from '@/screens/ListsScreen';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('ListsScreen', () => {
  beforeEach(() => reset());

  it('shows empty state when no lists', () => {
    render(
      <MemoryRouter initialEntries={['/lists']}>
        <Routes>
          <Route path="/lists" element={<ListsScreen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/No lists yet/i)).toBeInTheDocument();
  });

  it('wizard creates a list from a deck', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'A' } }],
    });
    render(
      <MemoryRouter initialEntries={['/lists']}>
        <Routes>
          <Route path="/lists" element={<ListsScreen />} />
          <Route path="/lists/:id" element={<div>List page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /\+ new list/i }));
    await user.selectOptions(screen.getByRole('combobox'), [deckId]);
    await user.type(screen.getByPlaceholderText(/shortlist/i), 'My');
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    expect(screen.getByText(/List page/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests; verify dev server can create a list**

Run: `npm test`. Run: `npm run dev` and create a list; confirm navigation to `/lists/:id` (which will render nothing until Task 11).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Lists screen with new-list wizard and row menu"
```

---

## Task 11: List view — base render and card detail sheet

**Files:**
- Create: `src/screens/ListScreen.tsx`, `src/components/CardDetailSheet.tsx`
- Modify: `src/router.tsx`
- Test: `tests/component/ListScreen.test.tsx`

- [ ] **Step 1: Create `CardDetailSheet.tsx`**

```tsx
import { useAppStore } from '@/store';
import { CardView } from './CardView';
import { Button } from './ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from './ui/sheet';

type Props = { listId: string };

export function CardDetailSheet({ listId }: Props) {
  const active = useAppStore((s) => s.ui.activeCardDetail);
  const setCardDetail = useAppStore((s) => s.setCardDetail);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setHidden = useAppStore((s) => s.setHidden);
  const moveCardToGroup = useAppStore((s) => s.moveCardToGroup);
  const removeCard = useAppStore((s) => s.removeCard);

  const open = active?.listId === listId;
  const card = deck?.cards.find((c) => c.id === active?.cardId);
  const ref = list?.cardRefs.find((r) => r.cardId === active?.cardId);

  return (
    <Sheet open={!!open} onOpenChange={(o) => !o && setCardDetail(null)}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Card</SheetTitle></SheetHeader>
        {card && deck && ref && (
          <div className="mt-3 space-y-4">
            <CardView card={card} mapping={deck.fieldMapping} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant={ref.hidden ? 'default' : 'outline'}
                onClick={() => setHidden(listId, card.id, !ref.hidden)}
              >
                {ref.hidden ? 'Unhide' : 'Hide'}
              </Button>
              <select
                className="rounded-md border bg-background p-2 text-sm"
                value={ref.groupId ?? ''}
                onChange={(e) => moveCardToGroup(listId, card.id, e.target.value || null)}
              >
                <option value="">(Ungrouped)</option>
                {list!.groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <Button
                variant="destructive"
                onClick={() => {
                  removeCard(listId, card.id);
                  setCardDetail(null);
                }}
              >
                Remove from list
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Create `ListScreen.tsx` (base render; dnd-kit and gestures come in later tasks)**

```tsx
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import { CardView } from '@/components/CardView';
import { CardDetailSheet } from '@/components/CardDetailSheet';

export default function ListScreen() {
  const { listId = '' } = useParams();
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setCardDetail = useAppStore((s) => s.setCardDetail);

  if (!list) return <div className="p-6">List not found.</div>;
  if (!deck) return <div className="p-6">This list's deck is missing. Re-import it or delete the list.</div>;

  const byGroup = new Map<string | null, typeof list.cardRefs>();
  for (const r of list.cardRefs) {
    if (r.hidden) continue;
    const key = r.groupId;
    const bucket = byGroup.get(key) ?? [];
    bucket.push(r);
    byGroup.set(key, bucket);
  }

  return (
    <div className="p-4 md:p-6">
      <header>
        <h2 className="text-xl font-semibold">{list.name}</h2>
      </header>

      {list.groups.map((g) => {
        const rows = byGroup.get(g.id) ?? [];
        if (!rows.length) return null;
        return (
          <section key={g.id} className="mt-6">
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">{g.name}</h3>
            <ul className="space-y-2">
              {rows.map((r) => {
                const card = deck.cards.find((c) => c.id === r.cardId);
                if (!card) return <li key={r.cardId} className="rounded border p-2 text-sm italic text-muted-foreground">Missing card</li>;
                return (
                  <li key={r.cardId}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setCardDetail({ listId: list.id, cardId: r.cardId })}
                    >
                      <CardView card={card} mapping={deck.fieldMapping} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {(byGroup.get(null)?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">(Ungrouped)</h3>
          <ul className="space-y-2">
            {byGroup.get(null)!.map((r) => {
              const card = deck.cards.find((c) => c.id === r.cardId);
              if (!card) return <li key={r.cardId} className="rounded border p-2 text-sm italic text-muted-foreground">Missing card</li>;
              return (
                <li key={r.cardId}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setCardDetail({ listId: list.id, cardId: r.cardId })}
                  >
                    <CardView card={card} mapping={deck.fieldMapping} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <CardDetailSheet listId={list.id} />
    </div>
  );
}
```

- [ ] **Step 3: Register route**

Add to `router.tsx`:
```tsx
{ path: 'lists/:listId', element: <ListScreen /> },
```

- [ ] **Step 4: Component test**

Create `tests/component/ListScreen.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListScreen from '@/screens/ListScreen';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('ListScreen', () => {
  beforeEach(() => reset());

  it('renders visible cards and opens detail sheet on tap', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }, { id: 'c2', fields: { t: 'Beta' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setHidden(listId, 'c2', true);

    render(
      <MemoryRouter initialEntries={[`/lists/${listId}`]}>
        <Routes>
          <Route path="/lists/:listId" element={<ListScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Alpha/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests; dev server check**

Run: `npm test`. Then `npm run dev`: create a list, confirm cards render and tapping opens a sheet.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add list view with grouped rendering and card detail sheet"
```

---

## Task 12: Groups CRUD — add / rename / recolor / delete / collapse

**Files:**
- Create: `src/components/GroupHeader.tsx`
- Modify: `src/screens/ListScreen.tsx`
- Test: `tests/component/GroupHeader.test.tsx`

- [ ] **Step 1: Create `GroupHeader.tsx`**

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { Group, GroupColor } from '@/lib/types';

const colorSwatch: Record<GroupColor, string> = {
  slate: 'bg-slate-400',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
};

type Props = { listId: string; group: Group; count: number };

export function GroupHeader({ listId, group, count }: Props) {
  const collapsed = useAppStore((s) => !!s.ui.collapsedGroups[group.id]);
  const toggleCollapsed = useAppStore((s) => s.toggleGroupCollapsed);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const setGroupColor = useAppStore((s) => s.setGroupColor);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  const onRename = () => {
    if (name.trim() && name !== group.name) renameGroup(listId, group.id, name.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 border-b pb-2">
      <button
        aria-label={collapsed ? 'Expand' : 'Collapse'}
        onClick={() => toggleCollapsed(group.id)}
        className="flex items-center"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <span className={cn('h-3 w-3 rounded-full', colorSwatch[group.color])} aria-hidden />
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={onRename}
          onKeyDown={(e) => { if (e.key === 'Enter') onRename(); if (e.key === 'Escape') { setName(group.name); setEditing(false); }}}
          className="flex-1 rounded-md border bg-background p-1 text-sm"
        />
      ) : (
        <button className="flex-1 text-left font-semibold" onClick={() => setEditing(true)}>
          {group.name}
        </button>
      )}
      <span className="text-xs text-muted-foreground">{count}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Group actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex gap-1 p-1">
            {(Object.keys(colorSwatch) as GroupColor[]).map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                className={cn('h-5 w-5 rounded-full', colorSwatch[c], group.color === c && 'ring-2 ring-foreground')}
                onClick={() => setGroupColor(listId, group.id, c)}
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditing(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => {
              if (confirm(`Delete group "${group.name}"? Cards move to Ungrouped.`)) {
                deleteGroup(listId, group.id);
              }
            }}
          >
            Delete group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

- [ ] **Step 2: Wire `GroupHeader` into `ListScreen` and add an "Add group" button**

In `ListScreen.tsx`, replace the `<h3>` group label with `<GroupHeader ... />` and respect collapsed state. Add a top-level button "+ Group":

```tsx
import { GroupHeader } from '@/components/GroupHeader';

// Inside component:
const addGroup = useAppStore((s) => s.addGroup);
const collapsed = useAppStore((s) => s.ui.collapsedGroups);
// ...
<header className="flex items-center justify-between">
  <h2 className="text-xl font-semibold">{list.name}</h2>
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      const name = prompt('Group name', 'New group');
      if (name && name.trim()) addGroup(list.id, name.trim());
    }}
  >
    + Group
  </Button>
</header>
// ...
{list.groups.map((g) => {
  const rows = byGroup.get(g.id) ?? [];
  const isCollapsed = !!collapsed[g.id];
  return (
    <section key={g.id} className="mt-6">
      <GroupHeader listId={list.id} group={g} count={rows.length} />
      {!isCollapsed && (
        <ul className="mt-2 space-y-2">
          {/* existing rows */}
        </ul>
      )}
    </section>
  );
})}
```

- [ ] **Step 3: Component test**

Create `tests/component/GroupHeader.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupHeader } from '@/components/GroupHeader';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

beforeEach(() => {
  reset();
  vi.stubGlobal('confirm', () => true);
});

describe('GroupHeader', () => {
  it('renames on input blur', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({ name: 'D', fieldMapping: { title: 't' }, cards: [{ id: 'c1', fields: { t: 'A' } }] });
    const listId = useAppStore.getState().createList(deckId, 'L');
    const gId = useAppStore.getState().addGroup(listId, 'Starters');
    const group = useAppStore.getState().lists[listId].groups[0];

    render(<GroupHeader listId={listId} group={group} count={0} />);
    await user.click(screen.getByRole('button', { name: /Starters/i }));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Warm-ups{Enter}');
    expect(useAppStore.getState().lists[listId].groups[0].name).toBe('Warm-ups');
  });
});
```

- [ ] **Step 4: Run tests and verify in browser**

Run: `npm test`. Run: `npm run dev` and exercise: add group, rename, change color, collapse, delete.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add group CRUD: create, rename, recolor, delete, collapse"
```

---

## Task 13: Drag-drop reorder (dnd-kit) within and across groups

**Files:**
- Create: `src/components/SortableCard.tsx`
- Modify: `src/screens/ListScreen.tsx`
- Test: `tests/component/sortable.test.tsx`

- [ ] **Step 1: Create `SortableCard.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';

type Props = { id: string; children: ReactNode };

export function SortableCard({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </li>
  );
}
```

- [ ] **Step 2: Wrap `ListScreen` content with `DndContext` and per-group `SortableContext`**

Replace the body of `ListScreen` with a structure like:

```tsx
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor,
  closestCenter, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { SortableCard } from '@/components/SortableCard';
// ...
const setCardRefs = useAppStore((s) => s.setCardRefs);
const moveCardToGroupAt = useAppStore((s) => s.moveCardToGroupAt);

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);

const refsByGroup = (gid: string | null) => list.cardRefs.filter((r) => r.groupId === gid && !r.hidden);

const onDragEnd = (evt: DragEndEvent) => {
  const { active, over } = evt;
  if (!over || active.id === over.id) return;
  const activeRef = list.cardRefs.find((r) => r.cardId === active.id);
  const overRef = list.cardRefs.find((r) => r.cardId === over.id);
  if (!activeRef) return;
  const sameGroup = overRef && overRef.groupId === activeRef.groupId;
  if (sameGroup) {
    const from = list.cardRefs.findIndex((r) => r.cardId === active.id);
    const to = list.cardRefs.findIndex((r) => r.cardId === over.id);
    if (from >= 0 && to >= 0 && from !== to) {
      const next = list.cardRefs.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setCardRefs(list.id, next);
    }
  } else if (overRef) {
    // cross-group: place before overRef in its group
    const groupRefs = list.cardRefs.filter((r) => r.groupId === overRef.groupId);
    const idx = groupRefs.findIndex((r) => r.cardId === overRef.cardId);
    moveCardToGroupAt(list.id, String(active.id), overRef.groupId, idx);
  }
};
```

Render each group and the ungrouped section inside its own `SortableContext`:

```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
  {list.groups.map((g) => {
    const rows = refsByGroup(g.id);
    return (
      <section key={g.id} className="mt-6">
        <GroupHeader listId={list.id} group={g} count={rows.length} />
        {!collapsed[g.id] && (
          <SortableContext items={rows.map((r) => r.cardId)} strategy={verticalListSortingStrategy}>
            <ul className="mt-2 space-y-2">
              {rows.map((r) => {
                const card = deck.cards.find((c) => c.id === r.cardId);
                return (
                  <SortableCard key={r.cardId} id={r.cardId}>
                    <button type="button" className="w-full text-left" onClick={() => setCardDetail({ listId: list.id, cardId: r.cardId })}>
                      {card ? <CardView card={card} mapping={deck.fieldMapping} /> : <div>Missing card</div>}
                    </button>
                  </SortableCard>
                );
              })}
            </ul>
          </SortableContext>
        )}
      </section>
    );
  })}
  {/* same for ungrouped bucket */}
</DndContext>
```

- [ ] **Step 3: Write a keyboard-sensor reorder component test**

Simulating pointer drag in jsdom is unreliable. Use the keyboard sensor instead.

Create `tests/component/sortable.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListScreen from '@/screens/ListScreen';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('Sortable reordering', () => {
  beforeEach(() => reset());

  it('moves a card down via keyboard sensor', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [
        { id: 'c1', fields: { t: 'Alpha' } },
        { id: 'c2', fields: { t: 'Beta' } },
      ],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    render(
      <MemoryRouter initialEntries={[`/lists/${listId}`]}>
        <Routes><Route path="/lists/:listId" element={<ListScreen />} /></Routes>
      </MemoryRouter>
    );
    const items = screen.getAllByRole('listitem');
    items[0].focus();
    await user.keyboard(' ');              // activate drag
    await user.keyboard('{ArrowDown}');    // move down
    await user.keyboard(' ');              // drop
    const ids = useAppStore.getState().lists[listId].cardRefs.map((r) => r.cardId);
    expect(ids).toEqual(['c2', 'c1']);
  });
});
```

- [ ] **Step 4: Run tests and exercise on device**

Run: `npm test`.
Run: `npm run dev` and drag cards on desktop + touch. (Manual verify on a phone goes in the final manual checklist.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add drag-drop reorder with dnd-kit, within and across groups"
```

---

## Task 14: Hidden cards — counter badge, sheet, restore

**Files:**
- Create: `src/components/HiddenCardsSheet.tsx`
- Modify: `src/screens/ListScreen.tsx`
- Test: `tests/component/HiddenCardsSheet.test.tsx`

- [ ] **Step 1: Create `HiddenCardsSheet.tsx`**

```tsx
import { useAppStore } from '@/store';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { CardView } from './CardView';

type Props = { listId: string };

export function HiddenCardsSheet({ listId }: Props) {
  const open = useAppStore((s) => s.ui.hiddenSheetOpen);
  const setOpen = useAppStore((s) => s.setHiddenSheetOpen);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setHidden = useAppStore((s) => s.setHidden);
  const restoreAll = useAppStore((s) => s.restoreAllHidden);
  if (!list || !deck) return null;
  const hiddenRefs = list.cardRefs.filter((r) => r.hidden);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Hidden cards ({hiddenRefs.length})</SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => restoreAll(listId)} disabled={!hiddenRefs.length}>
            Restore all
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {hiddenRefs.map((r) => {
            const card = deck.cards.find((c) => c.id === r.cardId);
            if (!card) return null;
            return (
              <li key={r.cardId} className="flex items-center gap-2">
                <div className="flex-1"><CardView card={card} mapping={deck.fieldMapping} /></div>
                <Button size="sm" onClick={() => setHidden(listId, r.cardId, false)}>Restore</Button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Add badge to list header**

In `ListScreen.tsx` header:

```tsx
const hiddenCount = list.cardRefs.filter((r) => r.hidden).length;
const setHiddenSheetOpen = useAppStore((s) => s.setHiddenSheetOpen);
// ...
{hiddenCount > 0 && (
  <button
    onClick={() => setHiddenSheetOpen(true)}
    className="rounded-full bg-muted px-3 py-1 text-xs"
  >
    {hiddenCount} hidden
  </button>
)}
// render <HiddenCardsSheet listId={list.id} /> near the end
```

- [ ] **Step 3: Component test**

Create `tests/component/HiddenCardsSheet.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HiddenCardsSheet } from '@/components/HiddenCardsSheet';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {}, ui: { ...s.ui, hiddenSheetOpen: true } }), true as unknown as false);

describe('HiddenCardsSheet', () => {
  beforeEach(() => reset());

  it('lists hidden cards and restores one', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setHidden(listId, 'c1', true);
    useAppStore.getState().setHiddenSheetOpen(true);

    render(<HiddenCardsSheet listId={listId} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /restore/i })[1]); // the per-row Restore
    expect(useAppStore.getState().lists[listId].cardRefs[0].hidden).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests; commit**

Run: `npm test`.

```bash
git add -A
git commit -m "Add hidden-cards counter and sheet with per-card and bulk restore"
```

---

## Task 15: Draw random card dialog

**Files:**
- Create: `src/components/DrawCardDialog.tsx`
- Modify: `src/screens/ListScreen.tsx`
- Test: `tests/component/DrawCardDialog.test.tsx`

- [ ] **Step 1: Create `DrawCardDialog.tsx`**

```tsx
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { CardView } from './CardView';
import { useAppStore } from '@/store';

type Props = { listId: string };

export function DrawCardDialog({ listId }: Props) {
  const open = useAppStore((s) => s.ui.drawCardOpen);
  const setOpen = useAppStore((s) => s.setDrawCardOpen);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const [currentId, setCurrentId] = useState<string | null>(null);

  const candidates = useMemo(
    () => (list ? list.cardRefs.filter((r) => !r.hidden).map((r) => r.cardId) : []),
    [list]
  );

  useEffect(() => {
    if (open && candidates.length) {
      setCurrentId(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }, [open]); // draw once on open

  if (!list || !deck) return null;
  const card = deck.cards.find((c) => c.id === currentId) ?? null;

  const drawAnother = () => {
    if (!candidates.length) return;
    setCurrentId(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Drawn card</DialogTitle></DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-muted-foreground">No visible cards to draw from.</p>
        ) : card ? (
          <CardView card={card} mapping={deck.fieldMapping} />
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={drawAnother} disabled={!candidates.length}>Draw another</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add FAB to `ListScreen.tsx`**

```tsx
const setDrawOpen = useAppStore((s) => s.setDrawCardOpen);
// ...
<button
  aria-label="Draw a random card"
  onClick={() => setDrawOpen(true)}
  className="fixed bottom-20 right-4 z-20 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg md:bottom-8"
>🎲</button>
<DrawCardDialog listId={list.id} />
```

- [ ] **Step 3: Component test**

Create `tests/component/DrawCardDialog.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawCardDialog } from '@/components/DrawCardDialog';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('DrawCardDialog', () => {
  beforeEach(() => reset());

  it('shows a card from the visible set', () => {
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setDrawCardOpen(true);
    render(<DrawCardDialog listId={listId} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests; commit**

```bash
git add -A
git commit -m "Add draw random card dialog with re-roll"
```

---

## Task 16: Shuffle + undo and list overflow menu

**Files:**
- Create: `src/components/ListMenu.tsx`, `src/hooks/useToastUndo.ts`
- Modify: `src/screens/ListScreen.tsx`
- Test: `tests/component/ListMenu.test.tsx`

- [ ] **Step 1: Create `ListMenu.tsx`** (overflow menu in list header)

```tsx
import { toast } from 'sonner';
import { MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAppStore } from '@/store';
import { exportListToMarkdown } from '@/lib/markdownExporter';
import { downloadTextFile } from '@/lib/download';
import { useNavigate } from 'react-router-dom';

type Props = { listId: string };

export function ListMenu({ listId }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const shuffleList = useAppStore((s) => s.shuffleList);
  const clearAllGroups = useAppStore((s) => s.clearAllGroups);
  const deleteList = useAppStore((s) => s.deleteList);
  const navigate = useNavigate();
  if (!list) return null;

  const onShuffle = () => {
    const before = list.cardRefs;
    shuffleList(listId);
    toast('Shuffled', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => setCardRefs(listId, before),
      },
    });
  };

  const onExport = () => {
    if (!deck) return;
    const today = new Date().toISOString().slice(0, 10);
    const md = exportListToMarkdown(list, deck, today);
    const slug = list.name.replace(/[^\w\-]+/g, '-').toLowerCase();
    downloadTextFile(`${slug}-${today}.md`, md);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="List actions"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onShuffle}>Shuffle</DropdownMenuItem>
        <DropdownMenuItem onClick={onExport} disabled={!deck}>Export as markdown</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => clearAllGroups(listId)}>Clear all groups</DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => {
            if (confirm(`Delete list "${list.name}"?`)) {
              deleteList(listId);
              navigate('/lists');
            }
          }}
        >
          Delete list
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Create `src/lib/download.ts`**

```ts
export function downloadTextFile(filename: string, content: string, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Wire `<ListMenu />` into `ListScreen.tsx` header**

- [ ] **Step 4: Component test**

Create `tests/component/ListMenu.test.tsx`:

```tsx
import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ListMenu } from '@/components/ListMenu';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('ListMenu', () => {
  beforeEach(() => reset());

  it('shuffle mutates order and undo restores', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, fields: { t: `C${i}` } })),
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    const before = useAppStore.getState().lists[listId].cardRefs.map((r) => r.cardId).join(',');

    render(<MemoryRouter><ListMenu listId={listId} /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /list actions/i }));
    await user.click(screen.getByRole('menuitem', { name: /shuffle/i }));

    // Shuffle happened; toast with Undo visible
    await user.click(await screen.findByRole('button', { name: /undo/i }));
    const after = useAppStore.getState().lists[listId].cardRefs.map((r) => r.cardId).join(',');
    expect(after).toBe(before);
  });
});
```

- [ ] **Step 5: Run tests; commit**

```bash
git add -A
git commit -m "Add list overflow menu: shuffle+undo, export markdown, clear groups, delete"
```

---

## Task 17: Swipe mode

**Files:**
- Create: `src/components/SwipeCard.tsx`, `src/screens/SwipeScreen.tsx` *(or mode-toggle in ListScreen)*
- Modify: `src/screens/ListScreen.tsx` (mode toggle + swipe mount), `src/router.tsx` *(no new route — use `?mode=swipe`)*
- Test: `tests/component/SwipeCard.test.tsx`

- [ ] **Step 1: Create `SwipeCard.tsx`**

```tsx
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useState } from 'react';
import type { Card, FieldMapping } from '@/lib/types';
import { CardView } from './CardView';

type Props = {
  card: Card;
  mapping: FieldMapping;
  onCommit: (direction: 'keep' | 'discard') => void;
};

export function SwipeCard({ card, mapping, onCommit }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const keepOpacity = useTransform(x, [40, 140], [0, 1]);
  const discardOpacity = useTransform(x, [-40, -140], [0, 1]);
  const [committing, setCommitting] = useState(false);

  const commit = (dir: 'keep' | 'discard') => {
    if (committing) return;
    setCommitting(true);
    animate(x, dir === 'keep' ? 500 : -500, {
      duration: 0.3,
      onComplete: () => onCommit(dir),
    });
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragElastic={0.7}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
          commit(info.offset.x > 0 ? 'keep' : 'discard');
        } else {
          animate(x, 0, { type: 'spring', stiffness: 300 });
        }
      }}
      className="relative"
      data-testid="swipe-card"
    >
      <motion.div style={{ opacity: keepOpacity }} className="pointer-events-none absolute inset-0 rounded-xl bg-emerald-500/20" />
      <motion.div style={{ opacity: discardOpacity }} className="pointer-events-none absolute inset-0 rounded-xl bg-rose-500/20" />
      <CardView card={card} mapping={mapping} />
    </motion.div>
  );
}
```

- [ ] **Step 2: Swipe mode block inside `ListScreen.tsx`**

Add a mode toggle in the header:
```tsx
const [params, setParams] = useSearchParams(); // import from react-router-dom
const mode = (params.get('mode') ?? 'view') as 'view' | 'swipe';
const setMode = (m: 'view' | 'swipe') => setParams((p) => { p.set('mode', m); return p; });

<div className="ml-2 inline-flex rounded-md border p-0.5 text-xs">
  <button className={cn('px-2 py-1', mode === 'view' && 'bg-muted')} onClick={() => setMode('view')}>View</button>
  <button className={cn('px-2 py-1', mode === 'swipe' && 'bg-muted')} onClick={() => setMode('swipe')}>Swipe</button>
</div>
```

Then render either view-mode body or `<SwipeSession listId={list.id} onDone={() => setMode('view')} />` based on `mode`.

Create `SwipeSession` inline (or a file `src/components/SwipeSession.tsx`):

```tsx
import { useMemo, useState } from 'react';
import { SwipeCard } from './SwipeCard';
import { Button } from './ui/button';
import { useAppStore } from '@/store';

type Props = { listId: string; onDone: () => void };

export function SwipeSession({ listId, onDone }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setHidden = useAppStore((s) => s.setHidden);

  const initialQueue = useMemo(
    () => (list ? list.cardRefs.filter((r) => !r.hidden).map((r) => r.cardId) : []),
    [listId] // freeze queue at session start
  );
  const [index, setIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<Array<{ cardId: string; direction: 'keep' | 'discard' }>>([]);
  const [kept, setKept] = useState(0);
  const [discarded, setDiscarded] = useState(0);

  if (!list || !deck) return null;

  const total = initialQueue.length;
  const remaining = total - index;

  if (remaining <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <h3 className="text-xl font-semibold">All done</h3>
        <p className="text-muted-foreground">{kept} kept · {discarded} discarded</p>
        <Button onClick={onDone}>Back to list</Button>
      </div>
    );
  }

  const cardId = initialQueue[index];
  const card = deck.cards.find((c) => c.id === cardId);
  if (!card) {
    setIndex((i) => i + 1);
    return null;
  }

  const commit = (dir: 'keep' | 'discard') => {
    if (dir === 'discard') {
      setHidden(listId, cardId, true);
      setDiscarded((n) => n + 1);
    } else {
      setKept((n) => n + 1);
    }
    setUndoStack((s) => [...s, { cardId, direction: dir }]);
    setIndex((i) => i + 1);
  };

  const undo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    if (last.direction === 'discard') setHidden(listId, last.cardId, false);
    setUndoStack((s) => s.slice(0, -1));
    if (last.direction === 'keep') setKept((n) => n - 1);
    else setDiscarded((n) => n - 1);
    setIndex((i) => i - 1);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex w-full items-center justify-between">
        <button onClick={onDone} aria-label="Exit swipe mode" className="text-sm underline">Close</button>
        <span className="rounded-full bg-muted px-3 py-1 text-xs">{index + 1} / {total}</span>
      </div>
      <div className="w-full max-w-md">
        <SwipeCard card={card} mapping={deck.fieldMapping} onCommit={commit} />
      </div>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => commit('discard')}>Discard</Button>
        <Button variant="outline" onClick={undo} disabled={!undoStack.length}>Undo</Button>
        <Button onClick={() => commit('keep')}>Keep</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Component test for SwipeCard buttons path**

Create `tests/component/SwipeCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwipeCard } from '@/components/SwipeCard';

describe('SwipeCard', () => {
  it('renders card contents', () => {
    const card = { id: 'c1', fields: { t: 'Alpha' } };
    render(<SwipeCard card={card} mapping={{ title: 't' }} onCommit={() => {}} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
```

(Framer-motion drag is impractical to simulate in jsdom; rely on E2E for threshold behavior — see Task 20.)

- [ ] **Step 4: Run tests; try on device**

Run: `npm test`. Run: `npm run dev`, toggle swipe mode; verify swipe, keep/discard, undo, progress, summary.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add swipe mode with keep/discard gestures, undo, progress, and summary"
```

---

## Task 18: Error handling polish and storage-failure path

**Files:**
- Modify: `src/components/ImportDeckButton.tsx` (already shows error toasts), `src/App.tsx` (add ErrorBoundary)
- Create: `src/components/ErrorBoundary.tsx`

- [ ] **Step 1: Create a minimal error boundary**

```tsx
import { Component, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(err: Error) { console.error('[deck-studio]', err); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold">Something went wrong.</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{this.state.error.message}</pre>
          <button className="mt-4 underline" onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap router in `App.tsx`**

```tsx
<ErrorBoundary>
  <RouterProvider router={router} />
</ErrorBoundary>
```

- [ ] **Step 3: Store-failure guard** — catch rejected writes from persist middleware by wiring `onRehydrateStorage` in `store/index.ts`:

```ts
persist(
  // … existing config
  {
    name: 'deck-studio:state',
    // …
    onRehydrateStorage: () => (_, err) => {
      if (err) {
        // defer toast to after Toaster mounts
        queueMicrotask(() => import('sonner').then(({ toast }) => toast.error("Couldn't load saved data. Your work is safe but not restored.")));
      }
    },
  }
)
```

- [ ] **Step 4: Verify the error boundary manually**

Add `throw new Error('boom')` behind a `?debugcrash=1` query param in `App.tsx` (feature-flagged, not committed). Test locally, then remove before committing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add top-level error boundary and store-rehydrate failure toast"
```

---

## Task 19: Sample deck in first-run CTA and polish

**Files:**
- Modify: `src/screens/DecksScreen.tsx` (already references `/sample-deck.json`)
- Modify: `src/styles/index.css` if needed for mobile viewport
- Modify: `index.html` — viewport meta, title

- [ ] **Step 1: Update `index.html`**

Ensure inside `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#ffffff" />
<title>Deck Studio</title>
```

- [ ] **Step 2: Add safe-area padding**

In `src/styles/index.css`:

```css
@layer base {
  body {
    padding-bottom: env(safe-area-inset-bottom);
    padding-top: env(safe-area-inset-top);
  }
}
```

- [ ] **Step 3: Verify on a real phone or responsive emulator**

Run: `npm run dev`. Use DevTools device emulation (iPhone 13). Confirm bottom tabs don't overlap home indicator; headers sit above the notch.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Polish: viewport meta, safe-area padding, page title"
```

---

## Task 20: End-to-end tests (Playwright golden paths)

**Files:**
- Create: `tests/e2e/golden.spec.ts`, `tests/e2e/swipe.spec.ts`, `tests/e2e/fixtures/sample.json`

- [ ] **Step 1: Create fixture**

`tests/e2e/fixtures/sample.json`:

```json
{
  "name": "E2E Deck",
  "fieldMapping": { "title": "prompt" },
  "cards": [
    { "id": "1", "prompt": "Alpha" },
    { "id": "2", "prompt": "Beta" },
    { "id": "3", "prompt": "Gamma" }
  ]
}
```

- [ ] **Step 2: Golden path — import → list → export**

`tests/e2e/golden.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('import, create list, export markdown', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles('input[type=file]', path.join(__dirname, 'fixtures/sample.json'));

  // pre-mapped → navigates back to /decks
  await expect(page.getByText('E2E Deck')).toBeVisible();

  await page.getByRole('link', { name: /lists/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox').selectOption({ label: 'E2E Deck' });
  await page.getByPlaceholder(/shortlist/i).fill('Shortlist');
  await page.getByRole('button', { name: /^create$/i }).click();

  await expect(page.getByRole('heading', { name: 'Shortlist' })).toBeVisible();
  await expect(page.getByText('Alpha')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /list actions/i }).click().then(() =>
      page.getByRole('menuitem', { name: /export as markdown/i }).click()
    ),
  ]);
  const md = (await download.createReadStream())!;
  let body = '';
  for await (const chunk of md) body += chunk.toString();
  expect(body).toContain('# Shortlist');
  expect(body).toContain('- **Alpha**');
});
```

- [ ] **Step 3: Swipe session path**

`tests/e2e/swipe.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('swipe session discards one and updates hidden counter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles('input[type=file]', path.join(__dirname, 'fixtures/sample.json'));

  await page.getByRole('link', { name: /lists/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox').selectOption({ label: 'E2E Deck' });
  await page.getByPlaceholder(/shortlist/i).fill('Review');
  await page.getByRole('button', { name: /^create$/i }).click();

  await page.getByRole('button', { name: /^swipe$/i }).click();
  await page.getByRole('button', { name: /discard/i }).click(); // Alpha discarded
  await page.getByRole('button', { name: /keep/i }).click();     // Beta kept
  await page.getByRole('button', { name: /keep/i }).click();     // Gamma kept
  await expect(page.getByRole('heading', { name: /all done/i })).toBeVisible();
  await page.getByRole('button', { name: /back to list/i }).click();

  await expect(page.getByText(/1 hidden/i)).toBeVisible();
});
```

- [ ] **Step 4: Run E2E**

```bash
npm run test:e2e
```

Expected: both specs pass on chromium.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Playwright E2E coverage for import→list→export and swipe session"
```

---

## Manual verification checklist (not a task; run after Task 20)

- [ ] `npm run build` succeeds; `npm run preview` renders the app
- [ ] Touch drag-reorder feels right on a real phone (iOS Safari + Android Chrome)
- [ ] Swipe thresholds feel right — no false positives on horizontal scrolling
- [ ] Hidden counter increments during swipe discard and restoring from the sheet works
- [ ] Markdown export file downloads with the expected content
- [ ] Refreshing the page retains decks and lists (IndexedDB persistence)
- [ ] Deleting a deck does NOT delete its lists; lists render `Missing card` placeholders
- [ ] Re-importing the same deck (same IDs) rehydrates the list's card rows

---

## Out of scope for this plan

(restated from the spec, §12) — PWA, backend/sync, spaced repetition, card content editing, multi-group tags, nested groups, multi-deck lists, Markdown re-import, per-card colors/icons, multi-step undo beyond shuffle and swipe.
