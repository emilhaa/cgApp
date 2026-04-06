import Link from "next/link";
import { getGameContent } from "@/src/core/gameContent";
import { ContentErrorScreen } from "@/src/ui/ContentErrorScreen";
import { CheckpointOverview } from "@/src/ui/CheckpointOverview";

export default function CheckpointsPage() {
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
              <p className="eyebrow">Prehľad hry</p>
              <h1 className="page-title">Checkpointy</h1>
            </div>
            <div className="corner-actions">
              <Link className="corner-link" href="/">
                Domov
              </Link>
              <Link aria-label="Pomoc a FAQ" className="corner-icon-link" href="/help">
                ?
              </Link>
            </div>
          </div>
        </section>

        <CheckpointOverview game={game} />
      </div>
    </main>
  );
}
