import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="app-shell">
      <div className="page-frame">
        <section className="hero-card">
          <div className="hero-topbar">
            <div>
              <p className="eyebrow">Pomoc</p>
              <h1 className="page-title">FAQ a podpora</h1>
            </div>
            <div className="corner-actions">
              <Link className="corner-link" href="/">
                Domov
              </Link>
            </div>
          </div>
          <p className="lead">
            Keď sa počas hry zasekneš alebo si nie si istý ďalším krokom, tu nájdeš rýchle vysvetlenia a
            kontakt, cez ktorý sa vieš ozvať.
          </p>
        </section>

        <section className="panel-card">
          <h2 className="section-title">Časté otázky</h2>
          <div className="support-stack">
            <section className="support-card">
              <p className="eyebrow">Hinty</p>
              <p className="section-copy">
                Hinty sa odhaľujú postupne. Najprv sa zobrazí Hint 1 a až potom Hint 2. Keď ich použiješ,
                po obnovení stránky ostanú otvorené.
              </p>
            </section>

            <section className="support-card">
              <p className="eyebrow">Riešenie a skip</p>
              <p className="section-copy">
                Zobraziť riešenie alebo failsafe ti len ukáže cestu ďalej, ale checkpoint tým ešte
                nepreskočíš. Preskočiť checkpoint je samostatná akcia, ktorá ho označí ako preskočený a
                odomkne ďalší.
              </p>
            </section>

            <section className="support-card">
              <p className="eyebrow">Slabý signál</p>
              <p className="section-copy">
                Ak máš slabý signál, pokračuj podľa textového popisu miesta a zadania. Keď sa spojenie na
                chvíľu zhorší, nemusí to znamenať koniec hry a po obnovení stránky môžeš ďalej pokračovať.
              </p>
            </section>

            <section className="support-card">
              <p className="eyebrow">Poloha</p>
              <p className="section-copy">
                Mapa, navigácia aj kontrola polohy sú len pomôcky. Ak poloha nefunguje alebo ju nechceš
                povoliť, hru to nezablokuje a môžeš pokračovať cez textové inštrukcie.
              </p>
            </section>

            <section className="support-card">
              <p className="eyebrow">Bezpečnosť</p>
              <p className="section-copy">
                Pri chôdzi mestom sleduj najmä okolie, cestu a premávku. Mobil si radšej pozri až keď stojíš
                na bezpečnom mieste a nevstupuj kvôli hre tam, kam je zákaz vstupu.
              </p>
            </section>
          </div>
        </section>

        <section className="panel-card">
          <h2 className="section-title">Kontakt a podpora</h2>
          <p className="section-copy">
            Ak sa hra správa nečakane alebo si naozaj nevieš rady, ozvi sa na <strong>podpora@example.com</strong>.
          </p>
          <ul className="notes-list">
            <li>Napíš názov checkpointu alebo jeho poradie, na ktorom sa problém stal.</li>
            <li>Pridaj zariadenie a prehliadač, napríklad Android Chrome alebo iPhone Safari.</li>
            <li>Stručne popíš, čo sa stalo a čo si skúšal predtým.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
