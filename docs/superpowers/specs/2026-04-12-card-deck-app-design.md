# Deck Studio — Design Spec

**Date:** 2026-04-12
**Status:** Draft — awaiting spec review

## 1. Summary

A responsive, client-side web app for working with card decks. Users import decks as JSON, create named lists from those decks, then reorder, group, hide, shuffle, draw, and review cards — including a Tinder-style per-item swipe review. Lists auto-save locally; export is one-way to Markdown for sharing into Obsidian or elsewhere.

Mobile-first. No backend. Installable as a PWA in a later phase.

## 2. Use Cases

The app targets three use-case families (not exclusive):

- **Decision-making & prioritization** — ranking features, values, candidates; surfacing gut preferences via swipe
- **Creative prompts** — Oblique Strategies-style cards, writing prompts, brainstorming catalysts
- **Games & party** — drawing prompts, trivia, icebreakers

A study/flashcards use case is **out of scope** for v1 — no spaced repetition, no scheduling, no learning state.

## 3. Core Concepts

### 3.1 Deck (immutable library)
An imported JSON file becomes a Deck. Decks contain cards with arbitrary fields. After import the user maps which field plays which role (title, subtitle, body, image, meta). Decks are immutable from the app's perspective: editing card content happens by re-importing the source file.

### 3.2 List (mutable workspace)
A List is a workspace derived from exactly one Deck. It contains an **ordered** sequence of card references (`cardRefs`) plus a set of named groups. Lists store:

- Ordering (independent of the deck)
- Group assignment per card (or `null` for ungrouped)
- Visibility flag per card (hidden / visible)
- Group metadata (name, color, order)

Lists reference deck cards by ID. Re-importing a deck updates the content visible in all its derived lists automatically (reactive via the store).

### 3.3 Group
A named, colored section within a list. A card belongs to at most one group (or is ungrouped). Groups are ordered. Deleting a group returns its cards to the ungrouped pool.

### 3.4 Visibility (hidden flag)
A card reference in a list can be `hidden`. Hidden cards are collapsed out of the main list view and are excluded from Markdown export. They remain in the list's data and can be restored.

### 3.5 Field mapping
Each deck stores a `fieldMapping` configured by the user after import. This maps display roles to raw field keys:

```ts
fieldMapping: {
  title: string;        // required
  subtitle?: string;
  body?: string;
  image?: string;
  meta?: string[];      // additional keys to show as key:value pairs
}
```

The mapping is editable after initial configuration from the deck detail screen.

## 4. Architecture

### 4.1 Stack
- **Build:** Vite + TypeScript
- **UI:** React 18
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives, copy-paste components)
- **State:** Zustand (with `persist` middleware)
- **Persistence:** IndexedDB via `idb-keyval` (single key for v1)
- **Routing:** `react-router-dom` v6
- **Drag-drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Gestures / animation:** `framer-motion`
- **Icons:** `lucide-react` (standard shadcn pairing)
- **Toasts:** `sonner` (standard shadcn pairing)

### 4.2 Deployment
Static bundle (`vite build` → `/dist`). Deployable anywhere: Cloudflare Pages, any static host, a USB stick, the user's own Mac server. No backend, no server functions.

### 4.3 PWA posture (deferred)
v1 ships as a plain SPA. PWA (manifest + service worker via `vite-plugin-pwa`) is a follow-up milestone, not part of this design.

### 4.4 Device priority
Mobile-first. Layouts and gestures optimize for phone use; desktop is responsive and fully functional but secondary. Swipe mode assumes touch as the primary input; keyboard fallback buttons are always visible.

### 4.5 Offline behavior
Because the app is fully client-side after initial load, it continues to work when offline *within the same tab/session*. A persistent offline-first posture (service worker, cached assets) is deferred with PWA.

## 5. Data Model

```ts
type Deck = {
  id: string;
  name: string;
  importedAt: string;          // ISO 8601
  fieldMapping: FieldMapping;
  cards: Card[];
};

type Card = {
  id: string;                  // from JSON if present, else uuid v4
  fields: Record<string, unknown>;
};

type FieldMapping = {
  title: string;
  subtitle?: string;
  body?: string;
  image?: string;
  meta?: string[];
};

type List = {
  id: string;
  name: string;
  deckId: string;
  createdAt: string;
  updatedAt: string;
  groups: Group[];             // ordered
  cardRefs: CardRef[];         // ordered — source of truth for list order
};

type Group = {
  id: string;
  name: string;
  color?: GroupColor;          // preset palette: see 5.1
};

type CardRef = {
  cardId: string;
  hidden: boolean;
  groupId: string | null;
};
```

### 5.1 Group color palette
Six preset swatches plus a neutral default. Values are Tailwind class roots the UI maps to badges/headers:

```ts
type GroupColor = 'slate' | 'rose' | 'amber' | 'emerald' | 'sky' | 'violet';
```

### 5.2 Invariants
- Every `CardRef.cardId` resolves to a card in the list's deck. If a ref cannot resolve (deck missing or card removed on re-import), the ref is rendered as a placeholder row `Missing card` and is excluded from export.
- Every `CardRef.groupId` is either `null` or matches an existing `Group.id` within the same list. Deleting a group rewrites its refs to `groupId: null`.
- `cardRefs` may contain the same `cardId` at most once per list.

### 5.3 Persistence
A single IndexedDB key `deck-studio:state` holds the serialized root state:

```ts
type PersistedState = {
  version: 1;
  decks: Record<string, Deck>;
  lists: Record<string, List>;
};
```

UI state (active mode, open sheets, undo stack, collapsed groups) is **not** persisted. Zustand's `persist` middleware handles read-on-mount and write-on-change; writes are debounced (200ms) to avoid thrashing during drag operations.

### 5.4 Migrations
The `version` field enables schema migrations. If the persisted `version` is lower than the app's current version, the store runs sequential migration functions on load. v1 ships at `version: 1`; no migrations needed yet, but the scaffold is in place.

## 6. Screens & Navigation

### 6.1 App shell
Two-tab bottom navigation (mobile) / top navigation (desktop at ≥`md` breakpoint):

- **Decks** (`/decks`)
- **Lists** (`/lists`)

The active tab is derived from the URL. Back navigation uses native browser back.

### 6.2 Decks tab (`/decks`)
- Scrollable list of decks: name, card count, import date
- Primary action `+ Import deck`
- Tap a deck → deck detail sheet: *Create new list from deck*, *View all cards*, *Re-configure mapping*, *Delete deck*
- Deleting a deck that has derived lists: confirmation dialog warns `N lists reference this deck and will lose their source` — choice is *Cancel* / *Delete anyway*. Choosing the latter leaves lists orphaned (refs render as `Missing card`); no cascade delete.
- Empty state: illustration + "Import a deck to get started" + a link to download a sample deck JSON

### 6.3 Deck field-mapping screen (`/decks/:deckId/configure`)
- Two-pane at `md`+ (fields left, preview right); stacked on mobile
- Detected fields from across all cards listed with role selectors (title required, others optional)
- `meta` role accepts multiple fields (multi-select) — these render as a small key:value block beneath the card body
- Live preview: a single sample card rendered using the current mapping
- `Save` persists mapping; required field (title) unmapped disables save

### 6.4 Lists tab (`/lists`)
- Scrollable list rows: name, source deck name, updated date, `{visible}/{total}` card count
- Primary action `+ New list` → deck picker → name dialog → opens list view (starts with all cards ungrouped in imported order)
- Row context menu (overflow button / long-press on mobile): *Rename*, *Duplicate*, *Export as markdown*, *Delete*

### 6.5 List view (`/lists/:listId`) — main workspace
- Header: list name (tap to rename inline), mode toggle (`View` / `Swipe`), overflow menu
- Overflow actions: *Shuffle*, *Export as markdown*, *Clear all groups*, *Delete list*
- **View mode** (default):
  - Sortable card rows grouped by `Group` in group order
  - Ungrouped cards appear under their own implicit section at the bottom
  - Per-group header: color dot, editable name, collapse chevron, card count, row menu (color picker, rename, delete)
  - `+ Group` button in header → inline name input → creates empty group at end
  - Hidden badge: top-right `N hidden` chip → opens bottom sheet (`HiddenCardsSheet`) listing hidden cards with per-row `Restore` and header `Restore all`
  - Floating action button (FAB): 🎲 Draw — opens `DrawCardDialog`
- Tap a card (no drag) → `CardDetailSheet`: full rendered card (all mapped fields + raw `meta`), actions *Hide*/*Unhide*, *Move to group* (picker), *Remove from list*

### 6.6 Swipe mode (`/lists/:listId?mode=swipe`)
- Full-screen card stack (top card draggable horizontally via framer-motion)
- Left swipe (beyond threshold) = discard → sets `hidden: true` on the ref
- Right swipe = keep → no mutation, advances stack
- Vertical drag is clamped
- Accessory buttons beneath card: *Discard* ×, *Undo* ↶, *Keep* ✓ — always visible for non-touch input
- Progress pill (top center): `N / total remaining`
- Top-right close button exits to View mode
- When queue is empty: full-screen summary `X kept · Y discarded` with `Back to list` button

### 6.7 Ephemeral UI
- `DrawCardDialog` — shows a uniformly-random visible card using full field mapping; `Draw another` re-rolls (same card possible); `Close` dismisses; no mutation
- `HiddenCardsSheet` — bottom sheet, per-row `Restore`, header `Restore all`
- `CardDetailSheet` — bottom sheet (mobile) / dialog (desktop); renders full card and list-level actions
- Inline group rename, inline new-group input

### 6.8 First-run experience
- Decks tab open
- Empty state with illustration, "Import a deck to get started" copy, a *Download sample deck* link that serves a bundled `sample-deck.json` from `/public`
- On first successful import, a single-shot toast hints at "Now create a list from your deck"

## 7. Interactions

### 7.1 Drag-drop (dnd-kit)
- Single `DndContext` wraps the list view
- Each group (including the implicit ungrouped section) is a `SortableContext` with `verticalListSortingStrategy`
- Card uses `useSortable`; the handle is the whole card body with a distance-activation constraint (5px) so a tap to open card detail is distinguishable from a drag
- Cross-group moves: `onDragOver` detects the target container; `onDragEnd` updates the `CardRef.groupId` and splices into the target index
- `DragOverlay` provides a smooth ghost that floats above the list during drag
- Accessibility: dnd-kit `KeyboardSensor` is enabled — focused card + arrow keys reorder; tab between cards within a group; this is covered by dnd-kit defaults
- Touch: `TouchSensor` with `delay: 150, tolerance: 5` to prevent accidental drags while scrolling

### 7.2 Swipe (framer-motion)
- `SwipeCard` component uses `motion.div` with `drag="x"`, `dragElastic: 0.7`, vertical drag clamped via `dragConstraints={{ top: 0, bottom: 0 }}`
- `useTransform(x, ...)` drives a red/green tint overlay for left/right drift
- Commit threshold: `|offsetX| > 100 || |velocityX| > 500`
  - Below threshold: spring back to origin
  - Above threshold: animate off-screen (300ms ease-out), commit the action, advance the stack
- The next card pre-renders behind the top card at `scale: 0.95, opacity: 0.8` and animates to `1/1` as the top card commits
- Undo: a single-step in-memory undo stack reverses the last commit; multi-step undo is out of scope for v1

### 7.3 Shuffle + undo
- `shuffle(listId)` performs Fisher-Yates over `cardRefs` (hidden cards shuffle too — still hidden)
- Pre-mutation, push previous order onto a session-only undo stack
- Displays a toast: `Shuffled · Undo` with 5s duration
- Undo pops the stack and restores the previous order
- Undo stack is cleared when navigating away from the list view

### 7.4 Draw random card
- Uniform random pick from *visible* `cardRefs` in the current list
- Displays the card in a large-format modal using the full field mapping
- `Draw another` re-rolls (independent each time)
- No mutation; closing returns to view mode

### 7.5 Show / hide
- Per-card `Hide` in card detail sheet; or swipe-left in swipe mode
- Hidden counter in list header reflects the count
- Hidden sheet lists hidden cards and restores individually or all at once

### 7.6 Groups
- Create: `+ Group` → inline input → creates group at end
- Rename: tap group name in header → inline input
- Color: group header menu → picker (six swatches + default neutral)
- Delete: group header menu → confirmation (`Move N cards to ungrouped?`) → deletes group, rewrites refs
- Reorder: long-press group header → drag to reorder groups
- Collapse: chevron on group header toggles visual collapse (stored in non-persisted UI state)

### 7.7 Accessibility
- Semantic HTML, labeled landmarks, skip-to-content link
- shadcn/ui provides accessible focus rings, `aria-*` attributes, keyboard navigation by default
- Icon-only buttons carry `aria-label`
- Drag-drop has keyboard-sensor fallback (arrow keys + Enter/Space)
- Swipe mode has persistent keep/discard/undo buttons
- Color is never the only channel: group colors pair with the group name; swipe direction pairs with icon + color

## 8. Import & Export

### 8.1 Deck import

**Trigger:** `+ Import deck` → `<input type="file" accept="application/json">`

**Parse:**
1. `FileReader.readAsText` → parse with `JSON.parse` inside `try/catch`
2. Detect shape, in order:
   - Plain array → treat as `{ cards: [...] }`, deck name = filename sans `.json`
   - Object with `cards` array → use `name` if present, else filename
   - Object with `fieldMapping` pre-set → skip mapping UI
3. For each card: assign `id` = `card.id` if present, else `uuid v4`. Warn and dedupe if duplicate IDs within the same deck (keep first occurrence, drop later).
4. Detect schema = union of all keys across all cards — this feeds the mapping UI.
5. Route to mapping screen if no mapping is pre-configured.

**Validation errors** (surface as shadcn `Dialog` with a concrete message):
- Non-JSON content → `Couldn't parse file. Not valid JSON.`
- Top-level shape unrecognized → `File doesn't look like a deck. Expected an array of cards or { name, cards: [...] }.`
- Empty cards → `No cards found in this file.`
- Card entries aren't objects → `Cards must be objects with fields.`
- Storage write fails (IDB quota) → `Couldn't save deck. Storage may be full.` + a link to *Export* or *Delete* existing decks

### 8.2 Example accepted shapes

```json
// Plain array
[{ "name": "Keep the dinner reservation" }, { "name": "Cancel" }]
```

```json
// With deck metadata
{
  "name": "Oblique Strategies",
  "cards": [
    { "id": "1", "prompt": "Use an old idea" },
    { "id": "2", "prompt": "Honor thy error as a hidden intention" }
  ]
}
```

```json
// With pre-configured mapping
{
  "name": "Party Prompts",
  "fieldMapping": { "title": "prompt", "subtitle": "category" },
  "cards": [ { "prompt": "…", "category": "Warmup" } ]
}
```

### 8.3 Markdown export

**Trigger:** list overflow menu → `Export as markdown`

**Generation:**
1. Build a string from the list using the deck's `fieldMapping`
2. `Blob` → `URL.createObjectURL` → synthetic `<a download>` click → URL revoked
3. Filename: `<slug(list.name)>-<yyyy-mm-dd>.md`

**Format:**

```md
# <List Name>

> From deck: *<Deck Name>* · <yyyy-mm-dd>

## <Group Name>
- **<Card Title>**
  <Card Body>
- **<Card Title>**

## (Ungrouped)
- **<Card Title>**
```

**Rules:**
- H1 = list name
- Blockquote with source deck name + export date
- One H2 per group in display order; ungrouped bucket under `## (Ungrouped)` only if it contains visible cards
- Card bullet: `- **{title}**`; body on the next line indented with two spaces, only if body is mapped and non-empty
- Hidden cards are excluded entirely
- Empty list (no visible cards) exports as headers plus `*No cards yet*`

### 8.4 Re-export
Each export writes a fresh file; there is no re-import of Markdown. Exports never mutate the list.

### 8.5 Re-configuring a deck's mapping
Mapping edits are reactive — all lists derived from that deck update card rendering instantly via the store. Ordering, grouping, and visibility are unaffected.

## 9. Error Handling

**Policy:** fail loud, fail specific, never silently drop data. All user-facing errors surface through shadcn `Dialog` (blocking) or `sonner` toast (non-blocking) with concrete messages.

| Failure | Surface | Recovery |
|---|---|---|
| Malformed JSON on import | Dialog with parser message | User retries with a valid file |
| Unrecognized shape | Dialog listing accepted shapes | User fixes the file |
| Empty deck | Dialog | User fixes the file |
| Duplicate card IDs | Non-blocking toast: `N duplicates removed` | Import proceeds |
| IDB write failure (quota) | Dialog with export/delete guidance | User frees space |
| Store hydration failure on load | Dialog: `Couldn't load saved data.` + *Reset app* button (guarded with a `Type RESET to confirm` input) | User resets or reloads |
| List references a deleted deck | List renders with header warning + card rows render as `Missing card` | User re-imports the deck or deletes the list |
| Markdown download failure | Toast: `Couldn't start download.` | User retries |
| Drag into a just-deleted group | No-op, drop returns card to source | — |

All caught errors are also `console.error`'d with a stable prefix `[deck-studio]` for debugging during development.

## 10. Testing Strategy

**Unit tests (Vitest):**
- `importer.ts` — shape detection, ID assignment, dedupe, error paths
- `markdownExporter.ts` — headings, grouping, hidden exclusion, empty list, escaping
- `shuffle.ts` — permutation correctness (statistical: 1000 runs, chi-square check)
- `fieldMapping` rendering helpers — title/subtitle/body/meta resolution against mixed data

**Component tests (Vitest + React Testing Library):**
- Deck import flow (file upload → mapping → save)
- List view: render groups, render hidden counter, open hidden sheet, restore
- Card detail sheet: hide/unhide flow
- Swipe card: simulated pointer events cross threshold → commit; below threshold → spring back; undo pops last commit
- Sortable card: simulate keyboard reorder (dnd-kit keyboard sensor — more reliable than synthesizing drag in jsdom)

**End-to-end tests (Playwright):**
- Golden path: import sample deck → map fields → create list → drag reorder → create group → move cards → export markdown → file downloaded with expected content
- Swipe session: open swipe mode → discard 3 → keep 2 → verify hidden counter updates
- Shuffle + undo
- Draw random card modal

**Manual verification checklist:**
- Touch swipe thresholds feel right on a real phone (iOS Safari, Android Chrome)
- Drag-reorder responsiveness on a real phone
- PWA install experience (post-v1, not covered in this spec)

## 11. File Structure

```
deck-studio/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json              # shadcn/ui config
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
│   │   └── ui/                  # shadcn components land here
│   ├── store/
│   │   ├── index.ts             # root Zustand store
│   │   ├── decksSlice.ts
│   │   ├── listsSlice.ts
│   │   ├── uiSlice.ts
│   │   ├── persistence.ts       # idb-keyval adapter for Zustand persist
│   │   └── migrations.ts
│   ├── lib/
│   │   ├── types.ts
│   │   ├── importer.ts
│   │   ├── markdownExporter.ts
│   │   ├── shuffle.ts
│   │   ├── uuid.ts
│   │   ├── cardFields.ts        # resolve fieldMapping against a card
│   │   └── download.ts          # Blob + anchor helper
│   ├── hooks/
│   │   ├── useList.ts
│   │   ├── useDeck.ts
│   │   └── useShuffle.ts
│   └── styles/
│       └── index.css
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-12-card-deck-app-design.md
```

## 12. Out of Scope for v1

Explicitly not in v1 (noted so reviewers don't flag them as omissions):

- Multi-user / sync / backend of any kind
- PWA manifest, service worker, installable app behavior
- Spaced repetition / study mode
- Editing card content within the app (cards are immutable from the deck)
- Tag-based grouping (single-group-per-card only)
- Nested groups
- Multi-deck lists (one list references exactly one deck)
- Re-import of exported Markdown
- Image-heavy or audio card decks (field mapping includes `image` but layout is optimized for text)
- Per-card color or per-card icon (visual emphasis is at the group level)
- Multi-step undo (shuffle has 1-step; swipe has 1-step; other operations have none)
- Deck versioning / diff when re-importing

## 13. Success Criteria

The v1 is successful when all of the following are true:

- A user can import a sample JSON deck, map its fields, create a list, reorder cards via drag, split them into two named groups, hide a few, run a swipe review on the visible ones, shuffle, draw a random card, and export the curated list as Markdown — all in one session, on a phone, without guidance
- No backend is required
- The bundle is under 300KB gzipped (soft target)
- All tests in the strategy above pass locally
- The app works fully offline once loaded
