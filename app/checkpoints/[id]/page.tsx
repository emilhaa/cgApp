"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import rawGameContent from "@/src/content/game.sk.json";
import { validateGameContent } from "@/src/core/contentValidation";
import {
  completeCheckpoint,
  enterSolvePhase,
  loadStoredProgress,
  recordWrongAttempt,
  recordPhotoVerificationResult,
  rememberVisitedCheckpoint,
  revealCheckpointSolution,
  revealNextHint,
  saveCheckpointPhoto,
  skipCheckpoint
} from "@/src/core/progress";
import { deriveCheckpointOverviewItems, getNextCheckpoint } from "@/src/core/gameLogic";
import { CheckpointMap } from "@/src/ui/CheckpointMap";
import { ContentErrorScreen } from "@/src/ui/ContentErrorScreen";
import { TaskRenderer } from "@/src/ui/TaskRenderer";
import type { GameSessionProgress, PhotoVerifyResponse, SessionCheckpointProgress } from "@/src/types/game";
import { useEffect, useState } from "react";

const validationResult = validateGameContent(rawGameContent);

export default function CheckpointDetailPage() {
  const params = useParams<{ id: string }>();

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

  const overviewItems = checkpoint ? deriveCheckpointOverviewItems(game, progress) : [];
  const currentItem = checkpoint ? overviewItems.find((item) => item.checkpoint.id === checkpoint.id) ?? null : null;
  const currentState = checkpoint ? (currentItem?.state ?? (checkpoint.order === 1 ? "active" : "locked")) : "locked";
  const isLocked = currentState === "locked";

  useEffect(() => {
    if (!isHydrated || !checkpoint || isLocked) {
      return;
    }

    const nextProgress = rememberVisitedCheckpoint(game, checkpoint.id);
    if (nextProgress) {
      setProgress(nextProgress);
    }
  }, [checkpoint, game, isHydrated, isLocked]);

  if (!checkpoint) {
    return (
      <main className="app-shell">
        <div className="page-frame">
          <section className="panel-card">
            <p className="eyebrow">Checkpoint</p>
            <h1 className="section-title">Checkpoint sa nenašiel</h1>
            <p className="section-copy">Skús sa vrátiť na úvod a pokračovať z dostupného checkpointu.</p>
            <div className="action-row">
              <Link className="action-link" href="/">
                Domov
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
            <p className="section-copy">Načítavam checkpoint.</p>
          </section>
        </div>
      </main>
    );
  }
  const nextCheckpoint = getNextCheckpoint(game, activeCheckpoint.id);
  const isSolved = currentState === "done" || currentState === "skipped";
  const isSessionCompleted = progress?.isCompleted ?? false;
  const checkpointProgress: SessionCheckpointProgress = progress?.checkpoints.find(
    (checkpointState) => checkpointState.checkpointId === activeCheckpoint.id
  ) ?? {
    checkpointId: activeCheckpoint.id,
    status: currentState,
    phase: "go",
    usedHintCount: 0,
    solutionShown: false,
    wrongAttemptCount: 0,
    photoProvided: false,
    photoVerifyAttemptCount: 0
  };
  const isGoPhase = currentState === "active" && checkpointProgress.phase === "go";
  const isSolvePhase = currentState === "active" && checkpointProgress.phase === "solve";
  const isRevealPhase = checkpointProgress.phase === "reveal" || isSolved;

  function handleComplete(completionState?: {
    photoProvided?: boolean;
    photoPreview?: string | null;
  }) {
    const nextProgress = completeCheckpoint(game, activeCheckpoint.id, completionState);
    if (!nextProgress) {
      return {
        ok: false,
        message: "Progres sa nepodarilo uložiť. Skús obnoviť stránku."
      };
    }

    setProgress(nextProgress);
    setStatusMessage(
      nextProgress.isCompleted
        ? "Checkpoint je hotový. Hra je dokončená a môžeš si pozrieť výsledok."
        : "Správne. Tento checkpoint je hotový a ďalší sa odomkol."
    );

    return { ok: true };
  }

  function handleEnterSolve() {
    const nextProgress = enterSolvePhase(game, activeCheckpoint.id);
    if (!nextProgress) {
      return;
    }

    setProgress(nextProgress);
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

  function handleSavePhoto(photoState: {
    photoProvided?: boolean;
    photoPreview?: string | null;
  }) {
    const nextProgress = saveCheckpointPhoto(game, activeCheckpoint.id, photoState);
    if (!nextProgress) {
      return {
        ok: false,
        message: "Fotku sa nepodarilo uložiť pre tento checkpoint. Skús ju vybrať ešte raz."
      };
    }

    setProgress(nextProgress);
    return { ok: true };
  }

  function handlePhotoVerifyResult(result: PhotoVerifyResponse) {
    const nextProgress = recordPhotoVerificationResult(game, activeCheckpoint.id, result);
    if (!nextProgress) {
      return {
        ok: false,
        message: "Výsledok overenia sa nepodarilo uložiť. Skús obnoviť stránku."
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
    setStatusMessage(
      nextProgress.isCompleted
        ? "Checkpoint bol preskočený. Hra je dokončená a môžeš si pozrieť výsledok."
        : "Checkpoint bol preskočený a ďalší sa odomkol."
    );
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
          <div className="hero-topbar">
            <div>
              <h1 className="page-title">{activeCheckpoint.title}</h1>
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
          <p className="lead">{activeCheckpoint.storyBeat}</p>
        </section>

        {isLocked ? (
          <section className="panel-card">
            <h2 className="section-title">Tento checkpoint je ešte zamknutý</h2>
            <p className="section-copy">Najprv dokonči aktuálny checkpoint. Potom sa odomkne aj tento.</p>
          </section>
        ) : isGoPhase ? (
          <section className="panel-card">
            <h2 className="section-title">Kam máš ísť</h2>
            <p className="section-copy">{activeCheckpoint.locationText}</p>
            {activeCheckpoint.location ? <CheckpointMap checkpoint={activeCheckpoint} /> : null}
            <div className="action-row">
              <button className="action-button" onClick={handleEnterSolve} type="button">
                Som na mieste
              </button>
            </div>
          </section>
        ) : isSolvePhase ? (
          <section className="panel-card">
            <h2 className="section-title">Zadanie</h2>
            <div className="detail-stack">
              <TaskRenderer
                checkpoint={activeCheckpoint}
                checkpointProgress={checkpointProgress}
                gameId={game.id}
                onComplete={handleComplete}
                onPhotoVerifyResult={handlePhotoVerifyResult}
                onRevealHint={handleRevealHint}
                onRevealSolution={handleRevealSolution}
                onSavePhoto={handleSavePhoto}
                onSkip={handleSkip}
                onWrongAttempt={handleWrongAttempt}
                sessionId={progress?.session_id ?? null}
              />
            </div>
          </section>
        ) : isRevealPhase ? (
          <section className="panel-card">
            <h2 className="section-title">
              {currentState === "skipped" ? "Checkpoint je preskočený" : "Checkpoint je hotový"}
            </h2>
            <p className="section-copy">
              {currentState === "skipped"
                ? "Tento checkpoint si preskočil. Cesta ďalej však ostáva otvorená."
                : "Tento checkpoint máš úspešne za sebou."}
            </p>
            <section className="support-card">
              <p className="eyebrow">Micro Guide</p>
              <p className="section-copy">{activeCheckpoint.microGuide}</p>
            </section>
            {statusMessage ? <p className="feedback-box feedback-box--success">{statusMessage}</p> : null}
            <div className="action-row">
              {nextCheckpoint ? (
                <Link className="action-link" href={`/checkpoints/${nextCheckpoint.id}`}>
                  Pokračovať na ďalší checkpoint
                </Link>
              ) : isSessionCompleted ? (
                <Link className="action-link" href="/finish">
                  Pozrieť výsledok hry
                </Link>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="panel-card">
            <h2 className="section-title">Fáza checkpointu sa nepodarila načítať</h2>
            <p className="section-copy">Skús obnoviť stránku alebo sa vrátiť na úvod.</p>
          </section>
        )}
      </div>
    </main>
  );
}
