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
          <div className="hero-topbar">
            <div>
              <p className="eyebrow">Mestská hra</p>
              <h1 className="page-title">{game.title}</h1>
            </div>
            <div className="corner-actions">
              <Link aria-label="Pomoc a FAQ" className="corner-icon-link" href="/help">
                ?
              </Link>
            </div>
          </div>
          <p className="lead">
            Objav Banskú Štiavnicu cez sériu stanovíšť, indícií a krátkych príbehov. Vyraz do ulíc a nechaj
            sa viesť od jedného checkpointu k ďalšiemu.
          </p>
        </section>

        <LandingActions game={game} />
      </div>
    </main>
  );
}
