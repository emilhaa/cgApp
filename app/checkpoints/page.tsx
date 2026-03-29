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
          <p className="eyebrow">Prehľad hry</p>
          <h1 className="page-title">Checkpointy</h1>
          <p className="lead">
            Tu vidíš všetky stanovištia v poradí a ich aktuálny stav. Zamknuté checkpointy ostávajú
            viditeľné, ale odomknú sa až postupom v hre.
          </p>
          <Link className="action-link" href="/">
            Späť na úvod
          </Link>
        </section>

        <CheckpointOverview game={game} />
      </div>
    </main>
  );
}
