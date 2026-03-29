import Link from "next/link";
import { getGameContent } from "@/src/core/gameContent";
import { ContentErrorScreen } from "@/src/ui/ContentErrorScreen";
import { LandingActions } from "@/src/ui/LandingActions";

export default function HomePage() {
  const result = getGameContent();

  if (!result.ok) {
    return (
      <main className="app-shell">
        <div className="page-frame">
          <ContentErrorScreen errors={result.errors} />
        </div>
      </main>
    );
  }

  const { game } = result;

  return (
    <main className="app-shell">
      <div className="page-frame">
        <section className="hero-card">
          <p className="eyebrow">Mestská hra</p>
          <h1 className="page-title">{game.title}</h1>
          <p className="lead">
            Objav Banskú Štiavnicu cez sériu stanovíšť, indícií a krátkych príbehov. Hru môžeš začať hneď
            alebo sa vrátiť tam, kde si naposledy skončil.
          </p>

          <div className="meta-grid">
            <div className="meta-item">
              <span className="meta-label">Trvanie</span>
              <span className="meta-value">{game.duration}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Stanovištia</span>
              <span className="meta-value">{game.checkpoints.length}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Jazyk</span>
              <span className="meta-value">{game.language.toUpperCase()}</span>
            </div>
          </div>
        </section>

        <section className="panel-card">
          <h2 className="section-title">Ako hra funguje</h2>
          <p className="section-copy">
            Hra je pripravená pre mobil a priebežne si pamätá tvoj postup v tomto prehliadači. Keď sa
            vrátiš neskôr, môžeš pokračovať bez nového štartu. Po dokončení sa ti zobrazí aj stručný
            výsledok celej session.
          </p>
        </section>

        <LandingActions game={game} />

        <section className="panel-card">
          <h2 className="section-title">Prehľad checkpointov</h2>
          <p className="section-copy">
            Ak si chceš pozrieť poradie checkpointov a ich aktuálny stav, otvor prehľad hry.
          </p>
          <Link className="action-link" href="/checkpoints">
            Otvoriť prehľad checkpointov
          </Link>
        </section>
      </div>
    </main>
  );
}
