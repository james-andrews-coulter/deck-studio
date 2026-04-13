# Deck Exercises — Design Spec

**Date:** 2026-04-13
**Status:** Draft — awaiting spec review
**Supersedes/extends:** 2026-04-12-card-deck-app-design.md

## 1. Summary

Extend Deck Studio with **exercises**: author-defined, read-only "games" that accompany a deck of cards. An exercise pairs a block of narrative instructions with a named grouping template (e.g., *Priority Planner* with five time-horizon buckets). Users pick an exercise when creating a list; the exercise seeds the list's groups and remains available as an in-context reference while they sort, via a peeking bottom sheet on mobile and a right-docked drawer on desktop.

Exercises live inside the deck JSON file. They are authored by the deck's creator and are not editable inside the app. Picking an exercise is optional — lists created without one behave exactly as they do today.

## 2. Goals & Non-goals

### 2.1 Goals

- A deck's JSON file can declare one or more exercises, each with a `name`, a `groups` template (ordered string labels), and freeform markdown `instructions`.
- When creating a list, the user can select one of the deck's exercises; the list is then *an instance of* that exercise.
- An exercise's groups seed the list's groups at creation.
- The exercise's instructions and template are reachable while working in the list without losing sight of the sort surface.
- Lists created without an exercise are still fully supported.

### 2.2 Non-goals (v1)

- In-app creation or editing of exercises. Exercises are authored in the deck JSON only.
- Swapping the exercise on an existing list. The exercise is locked at list creation.
- Multiple exercises per list.
- Exercise-level metadata beyond `id`, `name`, `instructions`, `groups` (no tagline, no colors, no icons, no difficulty, no duration).
- Per-group metadata in the template (no descriptions, no colors, no per-group instructions).
- Exercise-aware export. Markdown export retains the current format; the exercise's name is *not* embedded in the exported file for v1.
- Validating that the user's current group structure still matches the template. The template seeds groups and then the list is the user's to rearrange freely.

## 3. Conceptual Model

### 3.1 Exercise (new)

An Exercise is a named, read-only pairing of narrative instructions with a grouping template. It belongs to exactly one deck. A deck may have zero or more exercises.

- Exercises are optional on a deck. A deck with no `exercises` array (or an empty one) behaves as today.
- Exercises are read-only in-app. Editing happens by editing the deck's source JSON and re-importing.
- An exercise's `id` is stable and unique within its deck.

### 3.2 Exercise + List binding

When a user creates a list and picks an exercise, the list records the exercise's `id` on its `exerciseId` field. This binding is **locked at creation** and cannot be changed afterward. Swapping exercises is not supported; to use a different exercise, the user creates a new list.

The `exerciseId` reference is resolved at render time against the list's deck. If the exercise has been removed from the deck by a re-import (or the deck itself has been deleted), the binding is treated as *unresolved*: the companion panel is suppressed and the Lists index badge falls back to showing nothing. The list's groups and cardRefs are untouched — the data the user has built remains valid.

### 3.3 Template seeding

When the list is created with an exercise, the list's `groups` field is populated by translating each template label into a `Group` (new `id` per group, `color: 'slate'` — the default for newly-created groups per the base spec §5.1). The order of groups matches the order of labels in the template.

After seeding, the list owns its groups. The user may rename, recolor, reorder, delete, or add groups at will — identical to groups created any other way. The template itself is immutable reference content; it continues to show its original labels in the companion panel regardless of what the user has done to the list's groups.

## 4. Data Model Changes

### 4.1 Types (addition to `src/lib/types.ts`)

```ts
export type Exercise = {
  id: string;
  name: string;
  instructions: string;        // markdown; may be multi-paragraph
  groups: string[];            // ordered template labels, ≥ 1
};

export type Deck = {
  id: string;
  name: string;
  importedAt: string;
  fieldMapping: FieldMapping;
  cards: Card[];
  exercises?: Exercise[];      // new, optional
};

export type List = {
  id: string;
  name: string;
  deckId: string;
  createdAt: string;
  updatedAt: string;
  groups: Group[];
  cardRefs: CardRef[];
  exerciseId?: string;         // new, optional; locked at creation
};
```

Existing `Deck.exercises` and `List.exerciseId` are both optional — lists and decks that don't declare them work exactly as they do today.

### 4.2 Invariants

- `Deck.exercises?.[i].id` is unique within that deck.
- `Exercise.groups` is a non-empty array of non-empty strings. Duplicate labels within the same exercise are allowed (the user can disambiguate after seeding by renaming).
- `Exercise.name` is non-empty.
- `Exercise.instructions` is a string. Empty string is allowed (degenerate but valid — panel would render just the template).
- `List.exerciseId`, if present, either resolves to an `Exercise` on the list's deck **or** is treated as unresolved (companion panel suppressed). Unresolved `exerciseId` is **not** a data corruption — it's the expected state after a deck re-import that dropped the exercise.
- `List.exerciseId` is set at list creation and **never mutated** thereafter by any store action.

### 4.3 Persistence & migrations

- State schema version bumps from `1` → `2`.
- Migration `v1 → v2`: identity on `List` (no `exerciseId` added); identity on `Deck` (no `exercises` added). Both fields are optional, so the migration is a version bump with no data transformation. The scaffold for this exists already (base spec §5.4).

### 4.4 Deck JSON: authoring shape

```json
{
  "name": "The Pocket Muse",
  "fieldMapping": { "title": "prompt" },
  "cards": [ /* ... */ ],
  "exercises": [
    {
      "id": "priority-planner",
      "name": "Priority Planner",
      "instructions": "Our goals and priorities are not uniform: they require differing amounts of effort, and different timeframes in which they can be achieved.\n\nOnce you've selected a number of goals and priorities you wish to work towards, arrange them according to the time you expect it will take you to achieve them.",
      "groups": ["This Week", "This Month", "This Year", "Next Five Years", "Over a Lifetime"]
    }
  ]
}
```

Every field above is required. There is no optional metadata for v1. `instructions` accepts line breaks and markdown syntax; see §6.3 for rendering.

## 5. Importer Changes (`src/lib/importer.ts`)

### 5.1 Parsing

Extend `parseDeck` to read an optional `exercises` array from the deck root. Validation proceeds after existing card validation so that a malformed `exercises` array doesn't block the rest of the deck from importing.

For each entry in `exercises`:

- Reject entries that are not plain objects (array, primitive, null) with a warning code and skip. Other entries continue parsing.
- Require `id: string` (non-empty, unique within this deck). Reject otherwise; warning code `exercise_id_invalid` or `exercise_id_duplicate`; skip.
- Require `name: string` (non-empty, trimmed). Reject otherwise; warning code `exercise_name_missing`; skip.
- Require `instructions: string`. A missing field defaults to `""`; a non-string is a rejection (`exercise_instructions_invalid`; skip).
- Require `groups: string[]` with at least one non-empty entry. Blank entries are trimmed; if after trimming the array is empty, reject (`exercise_groups_missing`; skip). Non-string entries reject the whole exercise (`exercise_groups_invalid`).
- Successful entries are appended, in source order, to the parsed deck's `exercises` array.

### 5.2 ParsedDeck shape

```ts
export type ParsedDeck = {
  name: string;
  cards: Card[];
  fieldMapping: FieldMapping;
  exercises: Exercise[];        // empty array if input had none or all entries rejected
  detectedKeys: string[];
  skippedMapping: boolean;
  warnings: string[];
};
```

Importer exposes `exercises` as a regular array (not `undefined`) so downstream code doesn't need `?? []` boilerplate. Callers that persist the deck should only write `deck.exercises` if `exercises.length > 0` (keeping the serialized shape clean for decks that don't use them).

### 5.3 Warning surfacing

Exercise-related warnings attach to the existing `warnings` array. They are surfaced in the import UI as a non-blocking toast once import succeeds: `N exercises skipped — check the deck JSON`. They do *not* block the import. A deck with malformed exercises but valid cards still imports successfully with those exercises dropped.

## 6. UI Changes

### 6.1 Lists screen (`/lists`) — New list dialog

The existing new-list dialog (deck dropdown + name input; see `src/screens/ListsScreen.tsx`) gains a single new field: an optional **exercise selector**, positioned between the deck and name inputs.

Rendering rules:

- If the selected deck has no exercises, the selector is **not rendered**. Dialog looks and behaves exactly as today.
- If the selected deck has one or more exercises, a `<select>` is rendered with the first option `None — start empty` (value `""`) and one option per exercise (value = exercise id, label = exercise name), in source order. Default selection is `None`.
- Picking an exercise triggers a one-time auto-fill of the **Name** input with the exercise's name — only if the Name input is currently empty or still equals a previously auto-filled name. If the user has typed their own name, the auto-fill does not overwrite it. Auto-fill is a pure convenience; the name remains fully editable.
- A single-line preview sits directly beneath the selector when a non-`None` exercise is selected: `Seeds N groups: Label A · Label B · Label C…` (truncated with ellipsis if it overflows one line). This is a read-only hint; clicking it does nothing.

On `Create`:

- `createList(deckId, name, exerciseId?)` is called with the selected exerciseId or `undefined`.
- Store seeds the list's groups from the exercise template (§7.1).
- The dialog closes and the user is navigated to `/lists/:listId`.

### 6.2 Lists index — exercise badge

Each list row gains a subtle badge when `list.exerciseId` is set and resolves: a text-only pill underneath the list name, alongside the existing deck-name/card-count/date line.

```
Life Goals
The Pocket Muse · 10/12 cards · 2026-04-13
Priority Planner
```

Rendering:

- Small uppercase label, muted color (Tailwind `text-xs uppercase tracking-wide text-muted-foreground`).
- Only rendered if the exerciseId resolves against the list's deck; unresolved ids render nothing (no error state in the index).

### 6.3 List view (`/lists/:listId`) — Exercise companion panel

When the list has a resolved `exerciseId`, a **peeking companion** is rendered alongside the sort surface. When there is no exerciseId (or it's unresolved), nothing new is rendered — the list view is unchanged.

The companion has two behaviors: a **peek** (always visible when any exercise is bound) and an **expanded panel** (on-demand).

#### 6.3.1 Peek strip

- **Mobile (`< md` breakpoint):** a fixed-to-bottom strip sits above the BottomTabs nav (z-index below the BottomTabs and above the scrolling list). Full-width, height ~44px. Contents: `<ExerciseName>` on the left, `View guide →` button on the right. Tapping anywhere on the strip opens the expanded panel.
- **Desktop (`≥ md` breakpoint):** a fixed strip pinned to the right edge of the viewport, vertical orientation, ~40px wide, showing the exercise name rotated 90° and a small info icon. Collapsed width is small enough to sit outside the main content column. Click opens the expanded panel.
- Present only when the list has a resolved exerciseId.
- Keyboard: strip is a focusable `<button>`; `Enter`/`Space` opens the expanded panel.

The strip does **not** support a drag-to-peek gesture in v1. The design evaluated a draggable peek (framer-motion) and opted for a tap-to-open approach: tap is unambiguous, testable, keyboard-accessible, and matches the fidelity of similar shadcn patterns in the codebase. A drag-to-peek can be added later without breaking the model.

#### 6.3.2 Expanded panel

Opens from the peek strip. Mobile: slides up as a full-width bottom sheet (existing `Sheet side="bottom"`). Desktop: slides in from the right (existing `Sheet side="right"`). In both orientations the panel renders:

- Header: exercise `name` as `<SheetTitle>` + close button (built-in to `SheetContent`).
- Section 1 — **Instructions**: `instructions` rendered as markdown (see §6.3.3), scrollable.
- Section 2 — **Template**: a static vertical list of the exercise's `groups` labels in order, rendered in the same visual style as group headers used elsewhere but clearly marked as read-only reference. A small muted heading `Template` sits above the list.
- Optional foot: muted small-print reminder: `Your list's groups can differ — this is the original exercise template.`

The expanded panel is closed by tapping outside, pressing Escape, or the close button in the header. Closing returns focus to the peek strip.

#### 6.3.3 Markdown rendering

Instructions render as markdown. To avoid pulling in a heavy renderer, v1 supports a deliberate subset and implements it in a small in-tree helper (`src/lib/markdownLite.ts`):

- Paragraph breaks on blank lines
- Line breaks on single newlines (rendered as `<br>`)
- Bold via `**text**`
- Italic via `*text*` (single asterisk; underscores not supported)
- Unordered lists where every consecutive line starts with `- `
- Ordered lists where every consecutive line starts with `N. ` (arbitrary number, rendered in order)
- No headings, no links, no images, no code blocks, no tables, no raw HTML. Anything outside the subset renders as literal text.

All text is escaped against XSS before transformation. No `dangerouslySetInnerHTML` on raw author input. The output is a React element tree.

The rationale for a bespoke subset: instructions are short (a few paragraphs max), the deck JSON is user-authored trusted content, and we avoid a ~30 KB markdown library for what amounts to a dozen rendering rules. A third-party library can be introduced later if the ceiling is hit.

### 6.4 Where the companion does not appear

- Swipe mode (`/lists/:listId?mode=swipe`): no peek strip, no companion. The swipe surface is full-screen by design. When returning to view mode, the peek strip reappears.
- Lists with no `exerciseId` or with an unresolved one: no peek strip, no companion.
- The Decks tab, the deck configure screen, the lists index: no companion; only the lists index has the exercise badge (§6.2).

### 6.5 Deck detail sheet — exercise count chip

On the existing deck detail sheet (triggered by tapping a deck row), if the deck has exercises, a small `N exercises` muted chip appears beneath the deck name. Tapping does nothing in v1 — it's a disclosure hint only. No new screen is introduced for browsing a deck's exercises outside the list-creation flow.

## 7. Store Changes

### 7.1 `createList` signature change

`createList(deckId: string, name: string, exerciseId?: string): string` — the third parameter is optional.

Behavior:

- If `exerciseId` is `undefined` or an empty string: behaves exactly as today. `groups: []`, `exerciseId` not set on the list.
- If `exerciseId` is provided:
  - Look up the exercise on the deck. If it resolves, seed `groups` from the template (one new `Group` per label, fresh `id` each, `color: 'slate'`, order matches template). Set `list.exerciseId` to that id.
  - If the id does not resolve (pathological, shouldn't happen from the UI which only shows resolvable ids), throw. The caller is the dialog, so this surfaces as a dev-time error.

`cardRefs` initialization is unchanged regardless of exercise: one `CardRef` per card in the deck, `hidden: false`, `groupId: null` — the seeded groups start empty. Users then sort cards into them.

### 7.2 `duplicateList`

Duplicating a list copies `exerciseId` unchanged. The duplicate is an instance of the same exercise as the source, with the same current (user-modified) groups.

### 7.3 `deleteExercise` / `setExerciseId`

**Not added.** There is no store action to set or clear `exerciseId` after creation. This encodes the "locked at creation" invariant at the API surface level.

### 7.4 UI slice

The peek/expanded state is ephemeral, not persisted. Add to `uiSlice`:

```ts
exerciseSheetOpenByListId: Record<string, boolean>;
setExerciseSheetOpen: (listId: string, open: boolean) => void;
```

This mirrors the pattern used for the hidden sheet and allows multiple lists' expanded states to coexist cleanly across navigation without leaking.

## 8. File Structure (additions)

```
src/
├── components/
│   ├── ExercisePeekStrip.tsx       # new — the peek surface
│   └── ExerciseSheet.tsx           # new — expanded panel
├── lib/
│   └── markdownLite.ts             # new — tiny markdown renderer
└── …
tests/
├── unit/
│   ├── importer-exercises.test.ts  # new
│   ├── markdownLite.test.ts        # new
│   └── listsSlice-createList.test.ts  # updated
├── component/
│   ├── ListsScreen-picker.test.tsx # new
│   └── ExerciseSheet.test.tsx      # new
└── e2e/
    └── exercises.spec.ts           # new
```

No existing files are renamed. The new components import the shared `Sheet` primitive and add no new third-party dependencies.

## 9. Sample Deck

Extend `public/sample-deck.json` with two exercises so the feature is demo-able after a fresh import.

1. **Priority Planner** — five time horizons. Matches the authoring example in §4.4.
2. **Keep / Maybe / Park** — three-bucket triage template with one short paragraph of instructions. Demonstrates a minimal-instructions exercise.

The sample deck continues to work as today for users who don't pick an exercise.

## 10. Testing Strategy

### 10.1 Unit (Vitest)

- `importer.ts`
  - Deck with valid exercises → parsed and attached in source order.
  - Deck with no `exercises` field → parsed with `exercises: []`, no warnings.
  - Empty `exercises` array → `exercises: []`, no warnings.
  - Each rejection reason (id missing, id duplicate, name missing, instructions non-string, groups missing, groups non-string, entry not an object) → corresponding warning, rest of the deck still imports.
  - Malformed exercises do not block import of valid cards.
- `markdownLite.ts`
  - Paragraphs, bold, italic, unordered list, ordered list, line-break-within-paragraph.
  - XSS resistance: `<script>` in input renders as literal text; no DOM `<script>` inserted.
  - Unsupported syntax (headings, links) renders as literal text.
- `listsSlice.createList`
  - Called with no `exerciseId` → groups empty, `exerciseId` absent.
  - Called with a resolving `exerciseId` → groups seeded in order, `exerciseId` set.
  - Called with an unresolving id → throws.
  - Duplicate list preserves `exerciseId`.

### 10.2 Component (Vitest + React Testing Library)

- `ListsScreen` new-list dialog:
  - Picking a deck with no exercises → selector not in the DOM.
  - Picking a deck with exercises → selector present, defaults to None.
  - Picking an exercise → name input auto-fills, preview line renders, `groups.length` reflected.
  - Typing a custom name, then switching exercise → custom name is **not** overwritten.
  - Creating with an exercise → list has seeded groups matching template.
- `ExerciseSheet`:
  - Opens with instructions and template rendered in order.
  - Markdown subset renders correctly.
  - Template list shows the exercise's original labels even after the list's groups have been renamed / deleted.
- Lists index badge:
  - Renders exercise name for resolved binding.
  - Renders nothing for unresolved binding.

### 10.3 End-to-end (Playwright)

- Import sample deck → create list with *Priority Planner* → dialog shows groups preview → create → landing list view shows 5 seeded groups in order → peek strip present at bottom → tap strip → expanded sheet opens with instructions and template → close → back on list view.
- Rename one seeded group → open expanded sheet → template still shows original label.
- Create a second list with *None* → no peek strip, dialog behaves as today.
- Lists index shows the exercise tag for the first list, nothing for the second.

### 10.4 Manual verification

- Peek strip does not cover the bottom nav or the FAB on any viewport size.
- Expanded sheet is scrollable when instructions are long.
- Dark mode: peek strip and expanded panel respect existing surface/border tokens.

## 11. Error Handling

| Failure | Surface | Recovery |
|---|---|---|
| Exercise entry malformed in deck JSON | Non-blocking toast on import: `N exercises skipped` | User fixes the deck file and re-imports |
| `exerciseId` on a list fails to resolve (exercise removed by re-import) | Silent: companion panel and index badge suppressed | User re-adds the exercise in JSON and re-imports, OR deletes the list |
| Deck JSON supplies an exercise id that's duplicated | Warning code `exercise_id_duplicate`; later duplicates dropped, first kept | — |
| User picks an exercise, then clears the Name field and picks another | Auto-fill populates again (Name was empty) | — |
| Markdown input contains unsupported syntax | Rendered as literal text | — |
| IDB quota exceeded persisting new-shape state | Existing dialog (base spec §9) | — |

No new dialog types are introduced. All failures piggy-back on existing surfaces.

## 12. Out of Scope for v1

Explicitly not in v1:

- In-app authoring of exercises (create/edit/delete/reorder)
- Swapping an exercise on an existing list
- Multiple exercises bound to one list
- Per-group template metadata (descriptions, colors, icons)
- Exercise-specific card filtering ("this exercise only uses cards tagged `goal`")
- Exercise categories, tags, or folders within a deck
- Cross-deck exercises (exercises shared across decks)
- Exporting the exercise instructions/template into the markdown export
- A dedicated "browse all exercises in this deck" screen
- Images or rich media inside exercise instructions
- Reordering the groups the template seeded *via the exercise template itself* (the seeded groups are fully user-owned after creation and reorder via the normal list group-reorder action)

## 13. Success Criteria

v1 is successful when all of the following are true:

- A user who imports the bundled sample deck can create a list with *Priority Planner* selected, land in a list view with the five seeded groups in correct order, open the expanded companion, read the instructions, see the original template labels, dismiss the sheet, and continue sorting — all on a phone, without guidance.
- A user who picks *None* experiences the list-creation flow as identical to today.
- Re-importing a deck that adds, removes, or changes exercises does not corrupt existing lists; unresolved bindings degrade silently.
- Unit, component, and e2e tests above all pass.
- No regression in existing behavior: every currently-passing test continues to pass.
