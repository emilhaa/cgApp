"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import rawGameContent from "@/src/content/game.sk.json";
import { validateGameContent } from "@/src/core/contentValidation";
import { deriveFinishSummary } from "@/src/core/gameLogic";
import { clearStoredProgress, loadStoredProgress } from "@/src/core/progress";
import { ContentErrorScreen } from "@/src/ui/ContentErrorScreen";
import type { GameSessionProgress } from "@/src/types/game";

const validationResult = validateGameContent(rawGameContent);

export default function FinishPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<GameSessionProgress | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!validationResult.ok || !validationResult.data) {
      setIsHydrated(true);
      return;
    }

    setProgress(loadStoredProgress(validationResult.data));
    setIsHydrated(true);
  }, []);

  if (!validationResult.ok || !validationResult.data) {
    return (
      <main className="app-shell">
        <div className="page-frame">
          <ContentErrorScreen errors={validationResult.errors} />
        </div>
      </main>
    );
  }

  const game = validationResult.data;

  function handleRestart() {
    clearStoredProgress();
    setProgress(null);
    router.push("/");
  }

  if (!isHydrated) {
    return (
      <main className="app-shell">
        <div className="page-frame">
          <section className="panel-card">
            <p className="eyebrow">Výsledok hry</p>
            <h1 className="section-title">Pripravujem výsledok</h1>
            <p className="section-copy">Pripravujem výsledok tvojej hry.</p>
          </section>
        </div>
      </main>
    );
  }

  if (!progress || !progress.isCompleted) {
    return (
      <main className="app-shell">
        <div className="page-frame">
          <section className="panel-card">
            <p className="eyebrow">Výsledok hry</p>
            <h1 className="section-title">Hra ešte nie je dokončená</h1>
            <p className="section-copy">
              Dokonči alebo preskoč všetky checkpointy a potom sa sem zobrazí finálny súhrn hry.
            </p>
            <div className="action-row">
              <Link className="action-link" href="/">
                Späť na úvod
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const summary = deriveFinishSummary(game, progress);

  return (
    <main className="app-shell">
      <div className="page-frame">
        <section className="hero-card">
          <div className="hero-topbar">
            <div>
              <p className="eyebrow">Výsledok hry</p>
              <h1 className="page-title">Hra je úspešne dokončená</h1>
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
          <p className="lead">Prešiel si celú hru. Nižšie nájdeš krátky súhrn tvojej cesty mestom.</p>
        </section>

        <section className="panel-card">
          <h2 className="section-title">Súhrn hry</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Počet checkpointov</span>
              <strong className="summary-value">{summary.totalCheckpointCount}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Hotové checkpointy</span>
              <strong className="summary-value">{summary.doneCount}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Preskočené checkpointy</span>
              <strong className="summary-value">{summary.skippedCount}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Použité hinty</span>
              <strong className="summary-value">{summary.totalHintsUsed}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Zobrazené riešenia</span>
              <strong className="summary-value">{summary.totalShownSolutions}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Zlé pokusy</span>
              <strong className="summary-value">{summary.totalWrongAttempts}</strong>
            </div>
          </div>
        </section>

        <section className="panel-card">
          <div className="action-row">
            <button className="action-button" onClick={handleRestart} type="button">
              Začať hru odznova
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
