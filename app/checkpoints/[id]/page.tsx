"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import rawGameContent from "@/src/content/game.sk.json";
import { validateGameContent } from "@/src/core/contentValidation";
import {
  completeCheckpoint,
  loadStoredProgress,
  recordWrongAttempt,
  revealCheckpointSolution,
  revealNextHint,
  skipCheckpoint
} from "@/src/core/progress";
import { deriveCheckpointOverviewItems, getNextCheckpoint } from "@/src/core/gameLogic";
import { ContentErrorScreen } from "@/src/ui/ContentErrorScreen";
import { TaskRenderer } from "@/src/ui/TaskRenderer";
import type { GameSessionProgress, SessionCheckpointProgress } from "@/src/types/game";
import { useEffect, useState } from "react";

const validationResult = validateGameContent(rawGameContent);

export default function CheckpointDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

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
  const checkpointId = Array.isArray(params.id) ? params.id[0] : params.id;
  const checkpoint = game.checkpoints.find((item) => item.id === checkpointId);

  const [progress, setProgress] = useState<GameSessionProgress | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setProgress(loadStoredProgress(game));
    setIsHydrated(true);
    setStatusMessage(null);
  }, [game, checkpointId]);

  if (!checkpoint) {
    return (
      <main className="app-shell">
        <div className="page-frame">
          <section className="panel-card">
            <p className="eyebrow">Checkpoint</p>
            <h1 className="section-title">Checkpoint sa nenašiel</h1>
            <p className="section-copy">Skús sa vrátiť do prehľadu a otvoriť dostupný checkpoint.</p>
            <div className="action-row">
              <Link className="action-link" href="/checkpoints">
                Späť na prehľad
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const activeCheckpoint = checkpoint;

  if (!isHydrated) {
    return (
      <main className="app-shell">
        <div className="page-frame">
          <section className="panel-card">
            <p className="eyebrow">Checkpoint</p>
            <h1 className="section-title">Pripravujem checkpoint</h1>
            <p className="section-copy">Načítavam stav tvojej hry v tomto zariadení.</p>
          </section>
        </div>
      </main>
    );
  }

  const overviewItems = deriveCheckpointOverviewItems(game, progress);
  const currentItem = overviewItems.find((item) => item.checkpoint.id === activeCheckpoint.id) ?? null;
  const currentState = currentItem?.state ?? (activeCheckpoint.order === 1 ? "active" : "locked");
  const nextCheckpoint = getNextCheckpoint(game, activeCheckpoint.id);
  const isSolved = currentState === "done" || currentState === "skipped";
  const isLocked = currentState === "locked";
  const isSessionCompleted = progress?.isCompleted ?? false;
  const checkpointProgress: SessionCheckpointProgress = progress?.checkpoints.find(
    (checkpointState) => checkpointState.checkpointId === activeCheckpoint.id
  ) ?? {
    checkpointId: activeCheckpoint.id,
    status: currentState,
    phase: "go",
    usedHintCount: 0,
    solutionShown: false,
    wrongAttemptCount: 0
  };

  function handleComplete() {
    const nextProgress = completeCheckpoint(game, activeCheckpoint.id);
    if (!nextProgress) {
      return {
        ok: false,
        message: "Progres sa nepodarilo uložiť. Skús obnoviť stránku."
      };
    }

    setProgress(nextProgress);
    if (nextProgress.isCompleted) {
      router.push("/finish");
      return { ok: true };
    }

    setStatusMessage("Správne. Tento checkpoint je hotový a ďalší sa odomkol.");

    return { ok: true };
  }

  function handleRevealHint() {
    const nextProgress = revealNextHint(game, activeCheckpoint.id);
    if (!nextProgress) {
      return {
        ok: false,
        message: "Hint sa nepodarilo načítať. Skús obnoviť stránku."
      };
    }

    setProgress(nextProgress);
    return { ok: true };
  }

  function handleRevealSolution() {
    const nextProgress = revealCheckpointSolution(game, activeCheckpoint.id);
    if (!nextProgress) {
      return {
        ok: false,
        message: "Riešenie sa nepodarilo zobraziť. Skús obnoviť stránku."
      };
    }

    setProgress(nextProgress);
    return { ok: true };
  }

  function handleSkip() {
    const nextProgress = skipCheckpoint(game, activeCheckpoint.id);
    if (!nextProgress) {
      return {
        ok: false,
        message: "Checkpoint sa nepodarilo preskočiť. Skús obnoviť stránku."
      };
    }

    setProgress(nextProgress);
    if (nextProgress.isCompleted) {
      router.push("/finish");
      return { ok: true };
    }

    setStatusMessage("Checkpoint bol preskočený a ďalší sa odomkol.");
    return { ok: true };
  }

  function handleWrongAttempt() {
    const nextProgress = recordWrongAttempt(game, activeCheckpoint.id);
    if (!nextProgress) {
      return;
    }

    setProgress(nextProgress);
  }

  return (
    <main className="app-shell">
      <div className="page-frame">
        <section className="hero-card">
          <p className="eyebrow">Checkpoint {activeCheckpoint.order}</p>
          <h1 className="page-title">{activeCheckpoint.title}</h1>
          <p className="lead">{activeCheckpoint.storyBeat}</p>
        </section>

        {isLocked ? (
          <section className="panel-card">
            <h2 className="section-title">Tento checkpoint je ešte zamknutý</h2>
            <p className="section-copy">
              Najprv dokonči aktívny checkpoint. Potom sa tento odomkne v prehľade checkpointov.
            </p>
            <div className="action-row">
              <Link className="action-link" href="/checkpoints">
                Späť na prehľad
              </Link>
            </div>
          </section>
        ) : isSolved ? (
          <section className="panel-card">
            <h2 className="section-title">
              {currentState === "skipped" ? "Checkpoint je preskočený" : "Checkpoint je hotový"}
            </h2>
            <p className="section-copy">
              {currentState === "skipped"
                ? "Tento checkpoint si preskočil. Môžeš sa vrátiť do prehľadu alebo pokračovať ďalej."
                : "Tento checkpoint si už vyriešil. Môžeš sa vrátiť do prehľadu alebo pokračovať ďalej."}
            </p>
            {statusMessage ? <p className="feedback-box feedback-box--success">{statusMessage}</p> : null}
            <div className="action-row">
              <Link className="action-link" href="/checkpoints">
                Späť na prehľad
              </Link>
              {nextCheckpoint ? (
                <Link className="secondary-action-link" href={`/checkpoints/${nextCheckpoint.id}`}>
                  Pokračovať na ďalší checkpoint
                </Link>
              ) : isSessionCompleted ? (
                <Link className="secondary-action-link" href="/finish">
                  Pozrieť výsledok hry
                </Link>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="panel-card">
            <h2 className="section-title">Zadanie</h2>
            <div className="detail-stack">
              <TaskRenderer
                checkpoint={activeCheckpoint}
                checkpointProgress={checkpointProgress}
                onComplete={handleComplete}
                onRevealHint={handleRevealHint}
                onRevealSolution={handleRevealSolution}
                onSkip={handleSkip}
                onWrongAttempt={handleWrongAttempt}
              />
              <div className="action-row">
                <Link className="secondary-action-link" href="/checkpoints">
                  Späť na prehľad
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
