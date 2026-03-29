Názov projektu
City Game Štiavnica – PWA (MVP)

1) Cieľ a úspech
- Cieľ: spustiť web/PWA, cez ktorú turisti bez game mastera odohrajú city game.

2) Publikum a použitia
- Primárne: slovenskí turisti (páry/rodiny/partie 2–5)
- Sekundárne: zahraniční turisti (EN), teambuildingy, školy (neskôr)
- Kontext: mobil v ruke, vonku, slabší signál, slnko na displeji

3) Scope MVP:
- 1 hra, 10–12 checkpointov
- Checkpoint flow GO → SOLVE → REVEAL
- Mapa + “Otvoriť navigáciu” (pre aktívny checkpoint)
- GPS “Skontrolovať polohu” (helper, nie lock)
- Zadanie + input odpovede + overenie (3 task typy)
- Hint + failsafe/skip
- Uloženie progresu (bez účtu)
- Základné nastavenia: jazyk SK (EN neskôr)
- Základná “help” stránka (FAQ + kontakt)
- “Prehľad checkpointov (sekundárny screen)”
- Finish screen - ukoncenie hry

4) Out of scope (neskôr):
- platby, odomykanie, účty
- GPS geofencing lock
- leaderboard/scoring
- foto/audio AI validácia (len pripravený typ do schémy)
- admin rozhranie (môže byť len edit JSON)

5) Užívateľský flow:
- Landing → Start/Resume → Checkpoint GO (navigácia)
- GO → “Som na mieste” → SOLVE
- SOLVE → vyriešené/skip → REVEAL
- REVEAL → “Ďalší checkpoint” → ďalší GO
- “Prehľad checkpointov” len ako fallback

6) Kľúčové rozhodnutia (MVP pravidlá)
- Progres: localStorage (session_id + progress)
- Odomykanie:  lineárne (ďalší checkpoint sa odomkne až po vyriešení)
- Verifikácia: všetko musí byť overiteľné automaticky apkou bez gamemastera

7) Task typy (MVP)
- code: text input (normalize: trim, lowercase, bez diakritiky)
- multiple_choice: 3–4 možnosti, jedna správna
- sequence: zoradenie 4 položiek do správneho poradia

8) Každý checkpoint musí mať:
- zadanie (max 3 vety)
- overiteľnú odpoveď
- hint,
- failsafe (alternatívny spôsob/skip text)

9) Obsahová schéma (content)
- Game: id, title, duration, checkpoints[]
- Checkpoint: id, order, title, storyBeat, microGuide, taskType (text/multiple_choice,sequence), question, answer, options[], sequenceItems[], hints[], failsafe, location, locationText, media[]

10) UX požiadavky
- Mobile-first, veľké tlačidlá
- Čitateľnosť na slnku (kontrast)
- Vždy ukázať: kde som (progress), koľko zostáva
- Offline-light: texty dostupné aj pri slabom signále (cache neskôr)

11) Akceptačné kritériá (Definition of Done)
- Hra sa dá komplet odohrať na mobiloch Android/iOS v prehliadači
- Progres sa uloží a po refreshi alebo zavreti a otvoreni browsera pokracuje
- Každý checkpoint má: zadanie, odpoveď, hint, failsafe
- Žiadny “dead end”: vždy existuje cesta ďalej (hint/failsafe)
- Po vyriešení posledného checkpointu sa zobrazí koniec hry a session sa označí ako dokončená.
