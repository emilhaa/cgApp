# City Game Stiavnica

This repository contains the rebuild of the City Game Stiavnica web app.

## Current Status

Current MVP includes:
- landing, checkpoint flow, finish screen, help page
- local progress in `localStorage`
- content validation from `src/content/game.sk.json`
- playable task types: `code`, `multiple_choice`, `sequence`, `photo_pose`
- photo task AI verification via `/api/verify-photo`

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

## Environment

Create `.env.local` with:

```bash
OPENAI_API_KEY=your_openai_api_key
PHOTO_MODERATION=1
```

- `OPENAI_API_KEY`: required for `/api/verify-photo`
- `PHOTO_MODERATION`: optional, defaults to `1`
- set `PHOTO_MODERATION=0` to disable image moderation before AI verification

## Content Source

The game content currently lives in `src/content/game.sk.json`.

## Precomputed Routes

Route segments between checkpoints live in `game.routes` inside `src/content/game.sk.json`:

```json
{
  "fromId": "cp-01-trojicny",
  "toId": "cp-02-radnica",
  "distanceM": 80,
  "polyline": "..."
}
```

- add one segment per fixed checkpoint pair (`i -> i+1`)
- generate the encoded polyline once in an external routing tool, then paste it into JSON
- if you do not have a real route yet, you can temporarily use a short valid test polyline for UI testing
- the app intentionally does **not** call routing APIs at runtime; it only decodes and renders route data already stored in content

## Rebuild Rules

- `docs/PRD.md` is the source of truth for product behavior
- `docs/REBUILD_PLAN.md` is the active rebuild backlog
- `docs/Roadmap.md` preserves recovered behavior to restore
- keep MVP scope small
- keep content in JSON
- keep UI logic separate from content logic
