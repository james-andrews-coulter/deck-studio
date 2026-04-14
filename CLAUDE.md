# CLAUDE.md

Project-level guidance for AI assistants working on this repo.

## What this app is

Deck Studio is a mobile-first, client-side web app for sorting card decks: import a JSON deck, run an "exercise" (template of folders with instructions) over it, swipe-triage cards (Keep / Discard / Skip), organise into folders, and recursively build narrower lists for further exercises. Everything is local — no backend, no auth, IndexedDB-only.

## Working defaults for this repo

- **Auto-push to `main`.** Don't create feature branches or PRs unless explicitly asked. Commit + push directly after each task. (Saved in user memory; user is sole maintainer.)
- **Mobile-first; desktop inherits.** Don't add desktop-only alternates. Same UI scales up on wider breakpoints. The previous `flex-col-reverse` desktop pattern was removed.
- **Run lint + unit + e2e before committing UI changes.** `npm run lint && npm test && npm run test:e2e`. CI gate matches; if a Playwright spec needs a real LAN preview, that's noted in the spec.
- **Verify visually before claiming done.** When changing layout, drag-drop, sticky positioning, or sheets, capture a screenshot at the iPhone 13 viewport via Playwright (see `tests/e2e/_visual-check*.spec.ts` patterns) and inspect before pushing. Half-broken UI was shipped in earlier sessions because tests passed but the actual rendering was wrong.

## Stack snapshot

- Vite + React 18 + TypeScript
- Tailwind + shadcn/ui (hand-written primitives in `src/components/ui`)
- Zustand + `persist` middleware on IndexedDB via `idb-keyval`
- React Router v6
- @dnd-kit (sortable + droppable, no HTML5 drag)
- framer-motion (swipe gestures)
- sonner (toasts, bottom-center)
- Vitest + Testing Library, Playwright (chromium + iPhone 13 WebKit)

## Architecture quick map

```
src/lib/         pure helpers (types, importer, markdownLite, metaFilters, shuffle…)
src/store/       Zustand slices (decks, lists, ui) + persistence + migrations
src/components/  presentational; ui/ for shadcn primitives
src/screens/     route targets — DecksScreen, ListsScreen, ListScreen, DeckConfigureScreen
src/components/AppShell.tsx  body-scrolling shell + NavDrawer + a skip-link
```

### Routes
- `/decks` — imported decks index
- `/lists` — list index
- `/lists/:listId` — main list view (folder strip + Cards panel)
- `/lists/:listId?folder=<groupId>` — folder sub-view (cards in that folder; back arrow returns)
- `/lists/:listId?mode=swipe` — swipe mode for current scope

### Sticky chrome
On `ListScreen`, header + folder strip (when not in folder) + panel chrome (Select/Shuffle) + MetaFilterBar are wrapped in a single sticky container at `top: 0`. The bottom List/Swipe nav is `position: fixed`. **Do not use `backdrop-filter` on the sticky** — it creates a stacking context that fights with Radix portaled dropdowns on iOS Safari.

### Body scrolling
`<main>` is NOT `overflow-y-auto`. The body scrolls. iOS Safari has known bugs with `position: sticky` inside flex children with `overflow-y-auto`; switching to body scroll fixed it. If you reintroduce inner scrolling on `<main>`, iOS sticky breaks again.

### Drag-and-drop
- ONE `<DndContext>` wraps both the folder strip and the cards panel. Two contexts means cards can't drop on folders.
- Folder tile uses `useSortable` (which auto-registers as droppable). Active id starts with `GROUP_HEADER_PREFIX`. Card drops are detected by inspecting the active id type in `onDragEnd`.
- Drag is gated by a 5px distance constraint (PointerSensor) and a 150ms touch delay (TouchSensor). Folder + card grips are separate elements from the tap target so drag doesn't fight click.

### Sheets (bottom)
Pattern that survives iOS Safari with long content:
```tsx
<SheetContent side="bottom" className="flex max-h-[80svh] flex-col gap-0 p-0">
  <SheetHeader className="shrink-0 border-b ...">…</SheetHeader>
  <div className="min-h-0 flex-1 overflow-y-auto"
       style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
    …content…
  </div>
  <div className="shrink-0 border-t p-3"><Button className="w-full">Done</Button></div>
</SheetContent>
```
- `shrink-0` on header + footer or the title gets clipped.
- `min-h-0` on the scrolling middle so flex doesn't push it past the container.
- Always include a Done/Close button at the foot — the X in the header can scroll out of view if you put `overflow-y-auto` on `SheetContent` itself.

### iOS Safari quirks gathered the hard way
- **Input zoom**: `font-size: 16px` on `input/textarea/select` (unlayered CSS) + viewport `maximum-scale=1, user-scalable=no, minimum-scale=1`. Without the viewport tag, font-size alone isn't enough. Without the font-size, the viewport tag alone breaks accessibility.
- **Sticky inside overflow flex**: broken. Use body-scroll.
- **Backdrop-filter + Radix Portal**: don't combine on a sticky parent. Drop the blur.
- **Sheet absolute close button + `overflow-y-auto` on the same element**: the close scrolls away. Restructure to fixed header + scrolling middle.

## Data model

```ts
type Deck = {
  id; name; importedAt;
  fieldMapping: { title; subtitle?; body?; image?; meta?: string[] };
  cards: Array<{ id; fields: Record<string, unknown> }>;
  exercises?: Array<{ id; name; instructions; groups: string[] }>;
};

type List = {
  id; name; deckId; createdAt; updatedAt;
  groups: Array<{ id; name }>;          // no color field — the system was removed
  cardRefs: Array<{
    cardId; hidden: boolean; groupId: string | null;
    processed?: 'keep' | 'discard';
  }>;
  exerciseId?: string;                   // locked at creation
};
```

- `processed` is the swipe disposition. Swipe queue = `!hidden && !processed && in-scope && matches filters`. Moving a card to a different folder clears `processed` because each folder is its own swipe context.
- "Skip" in swipe is session-local (rotates current to the back of the queue) — no persistent flag.
- Hidden ≠ processed: hidden cards are excluded from the cards panel and exports. Discarded cards are also hidden (set both flags).

### Migrations

State schema is currently `version: 2`. v1 → v2 added optional `Deck.exercises` and `List.exerciseId` (identity migration since both are optional). Bump `CURRENT_VERSION` in `src/store/migrations.ts` and add a transformation function when schema changes.

## Tests

- `npm test` — Vitest, jsdom + happy-dom (depending on file). Component tests under `tests/component`, unit tests under `tests/unit`.
- `npm run test:e2e` — Playwright across `chromium` + iPhone 13 WebKit (`mobile`). Each spec has its own brand-new browser context so IndexedDB is fresh.
- E2e specs needing real drag-drop use `page.mouse.down/move(...steps)/up` — `dragTo` uses HTML5 DnD which @dnd-kit doesn't listen to.
- Tests that hit Zustand from outside React (`useAppStore.getState().…`) need `import 'fake-indexeddb/auto'` at the top. The persist middleware otherwise throws on `indexedDB is not defined`.

## File hotspots

- `src/screens/ListScreen.tsx` — the most complex file. Read it before touching anything in the list view. Folder/scope, sticky chrome, DnD root, swipe entry, dialogs, selection mode all live here.
- `src/components/SwipeSession.tsx` — the queue + Skip + count + Undo logic.
- `src/components/SwipeableRow.tsx` — generic swipe-to-reveal-actions component used by both card rows and folder tiles. Takes an `actions[]` array.
- `src/store/listsSlice.ts` — `createList`, `createListFromCards`, `setProcessed`, `moveCardToGroup` (clears processed on group change), `setHidden`, etc.

## Things explicitly NOT in scope (don't add unless asked)

- Group color system — was removed; user doesn't want it back.
- Top-level shuffle action — removed; per-panel shuffle (icon button in panel chrome) is the replacement.
- A persistent "skip" flag — skip is session-local by design.
- Backwards-compat shims for older deck JSON shapes beyond what the importer already accepts.
- A separate folder-detail sheet — folders are a sub-view at `?folder=<id>`, not a sheet.

## When in doubt

- Check the most recent specs in `docs/superpowers/specs/` for the canonical behaviour of new features.
- Re-read this file's "iOS Safari quirks" section before changing anything sticky, scrolling, or modal-related.
- Run a Playwright screenshot at the iPhone 13 viewport before claiming a UI fix is done.
