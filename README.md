# City Game Stiavnica

This repository contains the rebuild of the City Game Stiavnica web app.

## Current Status

Step 1 is in place:
- Next.js + TypeScript + App Router shell
- typed game content models
- runtime content loading
- runtime content validation
- friendly content error screen for blocking issues

Not implemented yet:
- player progress
- checkpoint solving flow
- maps, GPS, help, finish flow
- photo task UI
- photo AI verification

## Scripts

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run start
npm run typecheck
```

## Content Source

The game content currently lives in `src/content/game.sk.json`.

`photo_pose` is accepted by the loader and validator, but it is not rendered as an interactive task yet.

## Rebuild Rules

- `docs/PRD.md` is the source of truth for product behavior
- `docs/REBUILD_PLAN.md` is the active rebuild backlog
- `docs/Roadmap.md` preserves recovered behavior to restore
- keep MVP scope small
- keep content in JSON
- keep UI logic separate from content logic
