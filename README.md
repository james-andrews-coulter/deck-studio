# Deck Studio

A client-side, mobile-first web app for sorting and triaging card decks. Import a JSON deck, run an exercise (e.g. Priority Planner, Pyramid of Psychological Needs) over it, swipe to keep/discard, organise the keepers into folders, and copy a refined subset into a fresh list to run a different exercise on it.

No backend. No account. All data lives in the browser (IndexedDB).

## Features

- **Decks** — import any JSON deck; flexible field mapping (title / subtitle / body / image / meta) configured at import or later
- **Exercises** — author-defined "games" that ship inside the deck JSON: a name, narrative `instructions` (markdown), and a `groups` template that seeds the list's folders
- **Lists** — a workspace derived from one deck. Folders (renameable, draggable, deletable), an ungrouped Cards panel, and a sub-list view per folder
- **Swipe mode** — Tinder-style triage: Keep / Discard / Skip / Undo. Filters apply mid-session. Skipped cards rotate to the back of the queue. Kept and discarded cards are remembered so future swipes only show unprocessed cards (per scope)
- **Metadata filters** — one chip per `meta` field on the deck. Multi-select dropdown with `all` / `none` shortcuts; ANDs across keys, ORs within a key
- **Build new list from these cards** — copy whatever's currently visible in the ungrouped panel (after filters) into a fresh list with a different exercise
- **Folders as sub-views** — tap a folder tile and the URL updates to `?folder=<id>`; the page reuses the list layout scoped to that folder. Back arrow returns
- **Swipe-left row actions** — Hide / Move on cards, Delete on folders
- **Markdown export** — one-way publish to Obsidian, notes apps, anywhere text goes
- **PWA-installable** — Add to Home Screen on iOS/Android for a standalone-app feel

## Quick start

```bash
npm install
npm run dev   # http://localhost:5173, also exposed on the LAN by default
```

Open the dev URL, then click **Import deck** and load `public/sample-deck.json` (the *School of Life: What Do You Really Want?* deck — 140 cards, six exercises) to try the app out. Or import your own JSON.

To use the dev server from your phone on the same Wi‑Fi: visit `http://<mac-lan-ip>:5173`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (hot reload, binds 0.0.0.0) |
| `npm run build` | Typecheck + bundle to `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run lint` | `tsc --noEmit` across both tsconfigs (app + build) |
| `npm test` | Vitest unit + component tests, one pass |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright E2E (chromium + iPhone 13 WebKit) |

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** primitives (hand-written, no `tailwindcss-animate`)
- **Zustand** with `persist` middleware on **IndexedDB** (`idb-keyval` adapter)
- **React Router v6**
- **@dnd-kit** for drag-reorder + drag-into-folder
- **framer-motion** for swipe gestures + swipeable rows
- **sonner** for toasts
- **Vitest** + **@testing-library/react** for unit/component
- **Playwright** for E2E (chromium + iPhone 13 WebKit)

## Architecture

```
src/
├── lib/                  # Pure helpers: types, importer, markdown exporter,
│                         # markdown-lite renderer, meta filters, shuffle,
│                         # card-field resolver, group DnD ids
├── store/                # Zustand slices (decks, lists, UI) + IndexedDB persistence
├── components/           # All presentational components + shadcn/ui under ui/
└── screens/              # Route targets:
                          #   DecksScreen, ListsScreen,
                          #   ListScreen (handles ?folder=<id> sub-view + ?mode=swipe),
                          #   DeckConfigureScreen
```

### Data model

```ts
type Deck = {
  id; name; importedAt;
  fieldMapping: { title; subtitle?; body?; image?; meta?: string[] };
  cards: Array<{ id; fields: Record<string, unknown> }>;
  exercises?: Array<{ id; name; instructions; groups: string[] }>;
};

type List = {
  id; name; deckId; createdAt; updatedAt;
  groups: Array<{ id; name }>;
  cardRefs: Array<{
    cardId; hidden: boolean; groupId: string | null;
    processed?: 'keep' | 'discard';   // swipe disposition; cleared on group change
  }>;
  exerciseId?: string;                 // bound at creation; locked
};
```

- Cards are referenced by id, never duplicated. Editing a card in the deck JSON updates everywhere on re-import.
- `processed` is a swipe-session disposition. Cards marked `keep` or `discard` won't reappear in the swipe queue. Moving a card into a different folder clears its `processed` flag — each folder is its own swipe context.
- Skip in swipe mode is session-local (rotates to the back of the queue, no persisted flag).

### Routing

- `/decks` — list of imported decks
- `/lists` — index of curated lists
- `/lists/:listId` — main list view (folders + Cards panel)
- `/lists/:listId?folder=<groupId>` — folder sub-view (cards in that folder, no folder strip)
- `/lists/:listId?mode=swipe` — swipe mode (queue is unprocessed cards in current scope, with active filters applied)

See [`docs/superpowers/specs/`](docs/superpowers/specs/) for design specs and [`docs/superpowers/plans/`](docs/superpowers/plans/) for the implementation plans.

## Deck JSON format

Three accepted shapes:

```json
// 1. Plain array — deck name = filename
[{ "prompt": "Use an old idea" }, { "prompt": "Honor thy error" }]
```

```json
// 2. With metadata
{ "name": "Oblique Strategies", "cards": [/* … */] }
```

```json
// 3. Full shape with field mapping + exercises
{
  "name": "What Do You Really Want?",
  "fieldMapping": {
    "title": "prompt",
    "subtitle": "category",
    "meta": ["category"]            // surfaces a filter chip per key
  },
  "cards": [
    { "id": "1", "prompt": "More fun", "category": "FAMILY" }
  ],
  "exercises": [                     // optional
    {
      "id": "priority-planner",
      "name": "Priority Planner",
      "instructions": "Sort by time horizon.\n\n- This Week\n- This Month\n- This Year",
      "groups": ["This Week", "This Month", "This Year"]
    }
  ]
}
```

Notes:
- `fieldMapping.meta` declares which fields become filter chips. Without it, no filters render.
- Card IDs are preserved if present (must be strings); otherwise UUIDs are assigned. Duplicate IDs within a deck are deduped (first wins).
- `exercises` is optional. Each exercise needs `id`, `name`, `instructions` (string, markdown subset supported), and a non-empty `groups` array.

## Mobile testing

The app is mobile-first and primarily tested on iPhone via Safari. To test on a real phone:

1. Make sure the phone and the Mac share a network
2. Run `npm run dev`
3. Visit `http://<mac-lan-ip>:5173` from the phone
4. Optionally: **Share → Add to Home Screen** — the app installs as a standalone PWA

The viewport is locked at 1× zoom (`maximum-scale=1, user-scalable=no`) because pinch-zoom mid-drag breaks the DnD gestures. Form inputs are forced to 16px+ font-size to prevent iOS Safari's auto-zoom-on-focus.

## Deploy

`npm run build` produces a static bundle in `dist/`. Drop it anywhere that serves static files (Cloudflare Pages, Vercel, Netlify, S3, your own nginx). No backend required.

## CI

GitHub Actions runs lint + unit tests + build + Playwright E2E on every push to `main` and every PR. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## License

Private. All rights reserved.
