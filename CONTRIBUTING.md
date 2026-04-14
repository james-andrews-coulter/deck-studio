# Contributing

Thanks for taking an interest. This project is a small, opinionated, mobile-first app. The maintainer (James) works on it solo and happily accepts issues and small PRs — especially from anyone who sorts decks of cards for a living.

## Getting set up

```bash
nvm use            # reads .nvmrc (node 22)
npm install
npm run dev        # http://localhost:5173 (also bound to your LAN)
```

Open the dev URL, click **Import deck**, and load `public/sample-deck.json` to try the app.

## Before you push

```bash
npm run lint         # tsc --noEmit across both tsconfigs
npm test             # vitest unit + component, one pass
npm run test:e2e     # Playwright (chromium + iPhone 13 WebKit)
```

CI runs the same three on every push and PR. If you're changing anything visual, capture an iPhone 13 screenshot via Playwright and eyeball it — type checking catches code correctness, not layout.

## How to structure a PR

- One feature or fix per PR; keep commits small and focused.
- If you change behavior, update or add a test.
- If you change a persisted shape in the Zustand store, bump `CURRENT_VERSION` in `src/store/migrations.ts` and add a migration function.
- Read `CLAUDE.md` — it captures the iOS Safari quirks and architecture decisions the hard way. It's short; it'll save you time.

## What's out of scope

The project has a deliberately small surface. These are the things I've tried and don't want back:

- Group color system (removed — too fiddly, low payoff)
- Top-level shuffle (replaced by per-panel shuffle)
- Persistent "skip" flag in swipe mode (session-local by design)
- Desktop-only alternate layouts (mobile-first scales up; don't fork the UI)
- Backend, sync, accounts (this stays local-only)

## Code of Conduct

Be kind. This repo follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Disagreements about code are fine; make them about the code.

## License

By contributing, you agree your work will be released under the [MIT License](./LICENSE).
