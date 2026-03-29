# REBUILD_PLAN.md

# Rebuild Plan – City Game Štiavnica (PWA)

Tento dokument slúži ako pracovný plán na obnovu aplikácie po strate kódu.

## Účel dokumentu
- `docs/prd.md` = source of truth pre produktové správanie
- `Roadmap.md` = historický záznam toho, čo bolo v pôvodnej appke hotové
- `REBUILD_PLAN.md` = aktuálny plán obnovy kódu a funkcionality

## Rebuild princípy
- Obnovujeme **rovnakú funkcionalitu**, nie nutne identický pôvodný kód.
- Scope držíme malý, presne podľa MVP.
- Bez DB, authu, platieb, leaderboardu a adminu.
- Content ostáva v JSON súboroch.
- Player progress ostáva v `localStorage`.
- Preferujeme jednoduchý, čitateľný TypeScript.
- Separujeme content data od UI logiky.
- Väčšie zmeny robíme po moduloch, nie jedným veľkým promptom.

---

## 1. Cieľ obnovy

Obnoviť funkčnú mobilnú web/PWA aplikáciu pre city game v Banskej Štiavnici tak, aby:
- hráč vedel prejsť celú hru bez game mastera,
- progres sa ukladal a po refreshi sa zachoval,
- checkpointy fungovali v lineárnom poradí,
- flow bol Landing → Start/Resume → GO → SOLVE → REVEAL → Finish,
- fungovali task typy `code`, `multiple_choice`, `sequence`,
- bola zachovaná podpora media, mapy, navigácie, GPS helpera a help stránky,
- a následne sa doplnil `photo_pose` task a AI verify flow.

---

## 2. Recovered behavior to restore

Toto správanie považujeme za súčasť pôvodnej aplikácie a treba ho obnoviť:

### Core product behavior
- 1 hra
- 10–12 checkpointov
- mobil-first UX
- slabší signál nesmie zablokovať priechod hrou
- progress v `localStorage`
- lineárne odomykanie checkpointov
- bez účtu

### User flow
- Landing
- Start / Resume
- aktívny checkpoint
- GO → SOLVE → REVEAL
- finish screen po poslednom checkpointe
- checkpoint overview ako sekundárna fallback obrazovka

### Supported task types
- `code`
- `multiple_choice`
- `sequence`
- `photo_pose` (recovered from content/roadmap, rebuild in later phase)

### UX / behavior already present in old version
- Resume banner
- Reset session s potvrdením
- Hint 1 → Hint 2
- Show solution oddelené od Skip
- Skip s potvrdením
- Validácia content JSON pri štarte
- Help / FAQ stránka
- Obrázky v zadaniach
- Mapa + Otvoriť navigáciu
- GPS „Skontrolovať polohu“
- Permission UX pre geolokáciu
- Finish screen
- zachovanie stavu po refreshi

---

## 3. Known recovered content/assets

K dispozícii sú:
- `PRD.md`
- `Roadmap.md`
- `AGENTS.md`
- `game.sk.json`
- komunikácia s agentom v JSONL logu
- shared chat ako referenčný zdroj na rozhodnutia a copy

### Poznámky ku contentu
- `game.sk.json` je základný source pre obnovu checkpointov
- content je potrebné validovať pri štarte
- content môže obsahovať drobné nekonzistencie, ktoré treba explicitne označiť a opraviť kontrolovane

### Známé content anomálie na manuálny review
- `cp-09-dolna` vyzerá obsahovo nekonzistentne: otázka pôsobí ako foto task, ale task je `code`
- posledné 2 checkpointy majú podozrivé / odľahlé GPS súradnice
- v texte checkpointov sú preklepy a jazykové nekonzistencie, ktoré netreba riešiť ako prvý krok, iba ak blokujú funkcionalitu

---

## 4. Cieľová architektúra

Predpokladaná cieľová štruktúra projektu:

```text
app/
  layout.tsx
  globals.css
  page.tsx
  checkpoints/page.tsx
  checkpoints/[id]/page.tsx
  finish/page.tsx
  help/page.tsx
  api/verify-photo/route.ts

src/
  content/game.sk.json
  types/game.ts
  core/gameContent.ts
  core/contentValidation.ts
  core/gameLogic.ts
  core/progress.ts
  core/photoProcessing.ts
  core/photoVerify.ts
  ui/CheckpointMap.tsx
  ui/ContentErrorScreen.tsx

docs/
  prd.md
  roadmap.md
  env.md
  REBUILD_PLAN.md