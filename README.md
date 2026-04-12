# Deck Studio

A client-side, mobile-first web app for working with card decks: import JSON decks, curate named lists, reorder via drag-drop, group cards, hide/show, shuffle, run Tinder-style swipe review, and export curated lists as Markdown.

No backend. No account. All data lives in the browser (IndexedDB).

## Features

- **Import** any JSON deck; flexible field mapping (title / subtitle / body / image / meta) configured after import
- **Lists** are workspaces derived from a deck — reorder, group (with colors), hide/show, multi-select, drag-to-reorder groups
- **Swipe mode** — portrait card, keep/discard with gestures, undo, shuffled queue per session
- **Select mode** — checkbox on every row, bulk **Move to…** or **New group** from selection
- **Swipe-left row actions** (iOS-style) — Hide or Move to group without entering Select mode
- **Shuffle with undo toast**, **draw random card** in swipe mode
- **Markdown export** — one-way publish to Obsidian, notes apps, or anywhere text goes
- **PWA-installable** — Add to Home Screen on iOS/Android for a standalone-app feel

## Quick start

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # expose on LAN so a phone on the same WiFi can reach it
```

Open the dev URL, then click **Import deck** and load `public/sample-deck.json` to try the app out.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (hot reload) |
| `npm run build` | Typecheck + bundle to `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run lint` | `tsc --noEmit` across both tsconfigs (app + build configs) |
| `npm test` | Vitest unit + component tests, one pass |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright E2E (chromium + mobile WebKit) |

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (primitives hand-written, no `tailwindcss-animate` dep)
- **Zustand** with `persist` middleware on **IndexedDB** (`idb-keyval` adapter)
- **React Router v6** for navigation
- **@dnd-kit** for drag-reorder
- **framer-motion** for swipe gestures and swipe-left row actions
- **sonner** for toasts
- **Vitest** + **@testing-library/react** for unit/component tests
- **Playwright** for E2E (chromium + iPhone 13 WebKit projects)

## Architecture

```
src/
├── lib/                    # Pure helpers: types, importer, markdown exporter, shuffle, card-field resolver
├── store/                  # Zustand slices (decks, lists, UI) + IndexedDB persistence
├── components/             # Presentational components + shadcn/ui primitives under ui/
└── screens/                # Route targets (DecksScreen, ListsScreen, ListScreen, DeckConfigureScreen)
```

**Data model (top-level):**

- **Deck** — immutable library of cards with a user-configured field mapping
- **List** — a workspace: ordered `cardRefs` referencing a Deck's cards, plus `groups` and per-ref `hidden` / `groupId`
- **Card refs** are references, not copies — changing a card's content in the source deck updates all lists that reference it

See [`docs/superpowers/specs/2026-04-12-card-deck-app-design.md`](docs/superpowers/specs/2026-04-12-card-deck-app-design.md) for the full spec and [`docs/superpowers/plans/2026-04-12-deck-studio.md`](docs/superpowers/plans/2026-04-12-deck-studio.md) for the implementation plan.

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
// 3. With pre-configured field mapping (skips the in-app mapping UI)
{
  "name": "Creative Prompts",
  "fieldMapping": { "title": "prompt", "subtitle": "category", "body": "elaboration", "meta": ["tags"] },
  "cards": [/* … */]
}
```

Card IDs are preserved if present (must be strings); otherwise a UUID is assigned. Duplicate IDs within one deck are deduped (first wins, warning shown).

## Mobile testing

The app is mobile-first and tested on iPhone SE via Safari. To test on a real phone:

1. Make sure the phone and the Mac share a network
2. Run `npm run dev -- --host`
3. Visit `http://<mac-lan-ip>:5173` or `http://<mac-tailscale-name>:5173` from the phone
4. Optionally: **Share → Add to Home Screen** — the app installs as a standalone PWA

## Deploy

The output of `npm run build` is a static bundle in `dist/`. Drop it anywhere that serves static files (Cloudflare Pages, Vercel, Netlify, S3, your own nginx). No backend required.

## CI

GitHub Actions runs lint + unit tests + build + Playwright E2E on every push to `main` and every PR. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Known deferrals

Tracked in the [plan document](docs/superpowers/plans/2026-04-12-deck-studio.md) under "Known deviations from spec (v1)". At time of writing:

- Service worker / offline-first precaching (manifest is live; precaching is a later pass)
- Group drag-reorder works via header; dragging into a truly empty group without cards is not yet a drop target
- Dark-mode toggle (`darkMode: 'class'` is configured but there is no UI switch)
- First-run hint toast
- Skip-to-content accessibility link
- Replacement PNG icons for iOS home screen (SVG is used today)

## License

Private. All rights reserved.
