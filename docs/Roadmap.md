# Roadmap – City Game Štiavnica (PWA)
> Poznámka: Tento dokument pôvodne slúžil ako historický záznam stavu aplikácie pred stratou kódu.
> Rebuild core MVP bol dokončený. Ďalší vývoj pokračuje podľa tohto roadmapu.
> Detaily obnovy sú zdokumentované v `REBUILD_PLAN.md`.

Tento dokument je jednoduchý backlog/roadmap pre iterovanie MVP bez zbytočného chaosu.
Každý bod má cieľ a akceptačné kritériá. Keď sa niečo implementuje, presuň to do **Done**.

---

## Now (najbližšie 1–3 dni)

### 14) Predpočítané trasy medzi checkpointmi (route segments) + zobrazenie v embed mape
**Goal:** aby navigácia fungovala spoľahlivo bez otvárania externej aplikácie a bez runtime routing API.

**Acceptance criteria:**
- Content schema podporuje predpočítané trasy medzi checkpointmi (segmenty i→i+1).
- V GO fáze sa zobrazuje trasa (polyline) medzi aktuálnym a ďalším checkpointom.
- Zobrazuje sa aj vzdialenosť (m) pre segment.
- Ak je segment trasy missing, fallback je priamka medzi bodmi + krátka poznámka.
- “Otvoriť v Mapách” ostáva ako sekundárny fallback.
- Bez nových veľkých závislostí.

---

## Later (nápady / vyšší effort)

### 23) Unlock kód / voucher (pred platbami)
### 24) Platby (Stripe)
### 25) Admin-lite editor (import/export + edit checkpointov)
### 26) Photo verify / “overlay” task type (feature-flag)
### 27) Team/School modes (tímové sessiony, špecifické texty)

---

## Done

- ✅ Core MVP flow (landing → list → detail → solve → progress)
- ✅ Ukladanie progresu do localStorage
- ✅ Finish screen / ukončenie hry

### 1) Dvojstupňové hinty (Hint 1 + Hint 2) -- done 7.3.2026
**Goal:** znížiť frustráciu a zlepšiť hodnotenia bez nutnosti skipovať checkpointy.  
**Scope:** upraviť content schému + UI + progres.

**Acceptance criteria:**
- Každý checkpoint podporuje `hint1` a `hint2` (alebo `hints: [hint1, hint2]`).
- V UI je jasný flow: **Hint 1 → Hint 2** (Hint 2 je dostupný až po použití Hint 1).
- Použitie hintov sa ukladá do progresu (počítadlo na checkpoint).
- Po refreshi sa stav hintov zachová.
- Ak checkpoint nemá hint2, UI to zvládne (nezobrazí druhé tlačidlo / zobrazí “nie je dostupný”).
- Takisto po pouziti hintu 2 tlacidlo hint zmizne.

---

### 2) “Show solution” vs “Skip” (failsafe bez nutnosti skipu) -- done 7.3.2026
**Goal:** veľa ľudí chce len “posunúť sa ďalej” bez toho, aby im to pokazilo pocit z hry.  
**Scope:** rozlišovať medzi zobrazením riešenia a reálnym skipom checkpointu.

**Acceptance criteria:**
- Na checkpointe je možné zobraziť **Failsafe / riešenie** bez zmeny statusu checkpointu.
- Samotný **Skip checkpoint** je samostatná akcia s potvrdením (“Are you sure?”).
- Skip nastaví checkpoint status na `skipped` a odomkne ďalší checkpoint.
- Po zobrazení riešenia môže hráč stále checkpoint vyriešiť normálne (a status sa zmení na `done`).

---

### 3) Validácia content JSON pri štarte (fail fast) -- done 7.3.2026
**Goal:** predísť chybám na produkcii kvôli preklepom v JSON (zlá odpoveď, chýbajúce pole).  
**Scope:** jednoduchá runtime validácia + zrozumiteľná chybová hláška.

**Acceptance criteria:**
- Pri spustení hry appka skontroluje, že content má povinné polia a správne typy.
- Pri chybe zobrazí user-friendly obrazovku “Obsah hry je poškodený” + detail pre admina (napr. v dev mode).
- Validácia pokryje minimálne:
  - unique checkpoint ids
  - order je vzostupný bez duplicít
  - task type je jeden z podporovaných
  - pre multiple_choice: options obsahuje answer
  - pre sequence: answer je permutácia sequenceItems
  - pre code: answer nie je prázdny

---  

### 4) Help/FAQ v hre + “Contact support” CTA-- done 7.3.2026
**Goal:** znížiť počet správ typu “neviem čo robiť” a zlepšiť dôveru.

**Acceptance criteria:**
- Help stránka je dostupná z každej obrazovky (link/tlačidlo).
- Obsahuje krátke FAQ: hinty, skip, čo robiť pri slabom signále, bezpečnosť.
- Obsahuje kontakt (e-mail/forma) + info čo poslať (checkpoint, zariadenie).

---

### 5) “Resume banner” + reset session UX-- done 7.3.2026
**Goal:** zlepšiť UX návratu do hry (ľudia často hrajú na 2 razy).

**Acceptance criteria:**
- Ak existuje progress, landing ukáže “Pokračovať v hre” + “Začať odznova”.
- Reset vyžaduje potvrdenie.
- Reset vymaže progress a začne novú session.

---

### 6) Checkpoint location + media schema (pre mapu a obrázky) -- done 8.3.2026
**Goal:** pripraviť content tak, aby sme vedeli zobraziť mapu a obrázky v zadaniach bez ďalších prerábok.

**Acceptance criteria:**
- Do `Checkpoint` je pridané `location: { lat: number, lng: number, label?: string }`.
- V content JSON existuje aj textový popis miesta (napr. `locationText` alebo existujúce pole), aby hra fungovala aj bez GPS.
- Do `Task` je pridané voliteľné `media?: [{ type: "image", src: string, alt?: string }]`.
- App funguje aj keď niektoré checkpointy nemajú `location` alebo `media` (graceful handling).
- Sample JSON je aktualizovaný aspoň pre 2 checkpointy.

---

### 7) Mapa (MVP) + “Otvoriť navigáciu” -- done 8.3.2026
**Goal:** zlepšiť hrateľnosť tým, že hráč vždy vie, kam má ísť ďalej.

**Acceptance criteria:**
- Je dostupný mapový pohľad (na liste checkpointov alebo v detaile aktívneho checkpointu).
- Mapa zobrazuje piny pre checkpointy s `location.lat/lng`.
- Aktívny checkpoint je vizuálne odlíšený.
- Tlačidlo **“Otvoriť navigáciu”** otvorí externé mapy s cieľom na aktívny checkpoint (funguje na mobile).
- Ak checkpoint nemá `location`, app nespadne (zobrazí fallback text / skryje mapu).

---

### 8) Obrázky v zadaniach (task media render) -- done 8.3.2026
**Goal:** umožniť inventívnejšie úlohy a lepší “escape-room feeling” cez vizuálne zadania.

**Acceptance criteria:**
- Ak `task.media` obsahuje obrázky, zobrazia sa v detaile checkpointu (responsive, mobile-friendly).
- Obrázky sú servované z `public/` a v JSON sa referencujú relatívnou cestou (napr. `/media/...`).
- Ak task nemá media, UI sa správa rovnako ako doteraz (bez rozbitia layoutu).
- Aspoň 1 sample checkpoint má pridaný obrázok a je viditeľný.



### 9) GPS “Skontrolovať polohu” (helper, nie lock)-- done 8.3.2026
**Goal:** pomôcť hráčovi overiť, že je na správnom mieste, bez rizika frustrácie z geofencingu.

**Acceptance criteria:**
- V detaile aktívneho checkpointu je tlačidlo “Skontrolovať polohu”.
- Po kliknutí sa zistí poloha a zobrazí sa vzdialenosť k cieľu + hláška “si na mieste / si ešte ďaleko”.
- Ak užívateľ odmietne permission, zobrazí sa friendly fallback a hra funguje ďalej.
- Funkcia nič nezamyká ani neblokuje postup.



### 10) Checkpoint 3-phase flow: GO → SOLVE → REVEAL
**Goal:** znížiť chaos na obrazovke a spraviť hru prehľadnú na mobile.

**Acceptance criteria:**
- Každý checkpoint má 3 fázy:
  - **GO:** storyBeat + locationText + mapa + “Otvoriť navigáciu” + (voliteľne) “Skontrolovať polohu” + “Som na mieste”
  - **SOLVE:** zadanie + media + input + hinty + show solution + skip
  - **REVEAL:** microGuide (zaujímavosť) + krátky story progress + “Ďalší checkpoint”
- Po vyriešení/skipnutí checkpointu sa zobrazí REVEAL, nie okamžitý prechod na ďalší SOLVE.
- “Prehľad checkpointov” zostane dostupný len ako sekundárna možnosť (menu/link).
- Refresh v každej fáze zachová aktuálnu fázu (uložené v localStorage).
- Po poslednom checkpointe flow skončí na Finish screen.

### 11)
**Goal:** Improve location permission UX using the Permissions API if available.

**Acceptance criteria:**
- Before calling geolocation, check permission state (navigator.permissions.query({name:'geolocation'}) when supported).
- If state is 'denied', do NOT call geolocation; instead show instructions to re-enable in browser settings.
- If state is 'prompt', show the "Poloha je dobrovoľná" explanation and then request on user action.
- If state is 'granted', request normally.
- Provide short SK instructions for Android Chrome and iOS Safari.
- No new dependencies.

### 12) Photo task type (MVP UI): odfotiť/nahrať fotku + preview + progres (bez AI verifikácie)
**Goal:** overiť UX a technickú realizovateľnosť fototaskov na mobiloch bez zbytočnej komplexity.

**Acceptance criteria:**
- Nový task typ `photo_pose` v schéme + validácia contentu.
- V SOLVE fáze: upload/camera input, preview, tlačidlo “Použiť fotku”.
- Fotka sa lokálne spracuje (resize/compress) a uloží sa len do runtime progresu ako “photo provided” (nie do server storage).
- Checkpoint sa dá dokončiť cez “Použiť fotku” (dočasne bez AI).
- Failsafe/skip funguje ako doteraz.

---

### 13) Photo task type (AI verify): server endpoint + OpenAI vision + moderation + fallback
**Goal:** pridať “wow” verifikáciu pózy bez ukladania fotiek a s bezpečným fallbackom.

**Acceptance criteria:**
- Server endpoint `/api/verify-photo` (server-side, API key never in client).
- Client posiela komprimovaný obrázok; server ho neukladá.
- Pred verifikáciou prebehne moderácia obrázka; pri flagged vráti safe message.
- Vision verifikácia vráti `pass/fail/unsure` + krátky feedback (SK).
- UI umožní retry, a vždy existuje fallback (show solution / skip).

## Next (po stabilizácii Now)

### 18) EN lokalizácia – príprava štruktúry
**Goal:** pripraviť sa na druhý jazyk bez prerábok.

**Acceptance criteria:**
- Content layout podporuje viac jazykov (napr. samostatný JSON `game.en.json`).
- UI má prepínač jazyka (môže byť skrytý/len query param v MVP).
- Bez zmeny logiky taskov.
