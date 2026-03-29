"use client";

import { useEffect, useState } from "react";
import {
  continueStoredProgress,
  loadStoredProgress,
  restartProgress,
  startNewProgress
} from "@/src/core/progress";
import type { GameContent, GameSessionProgress } from "@/src/types/game";

type LandingActionsProps = {
  game: GameContent;
};

const buttonRowStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "12px",
  marginTop: "18px"
};

const primaryButtonStyle = {
  appearance: "none" as const,
  border: "none",
  borderRadius: "999px",
  background: "var(--accent)",
  color: "white",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  padding: "14px 18px"
};

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: "rgba(124, 74, 29, 0.12)",
  border: "1px solid rgba(124, 74, 29, 0.22)",
  color: "var(--text)"
};

const infoCardStyle = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(124, 74, 29, 0.18)",
  background: "rgba(240, 228, 200, 0.36)"
};

const statusTextStyle = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(124, 74, 29, 0.18)",
  background: "rgba(240, 228, 200, 0.36)",
  color: "var(--text)",
  lineHeight: 1.5
};

function shortSessionId(sessionId: string) {
  return sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
}

function getActiveCheckpointTitle(game: GameContent, progress: GameSessionProgress | null) {
  const activeCheckpointId = progress?.activeCheckpointId ?? game.checkpoints[0]?.id;
  const activeCheckpoint = game.checkpoints.find((checkpoint) => checkpoint.id === activeCheckpointId);
  return activeCheckpoint?.title ?? game.checkpoints[0]?.title ?? "Prvý checkpoint";
}

function getCompletedCount(progress: GameSessionProgress | null) {
  if (!progress) {
    return 0;
  }

  return progress.checkpoints.filter(
    (checkpoint) => checkpoint.status === "done" || checkpoint.status === "skipped"
  ).length;
}

export function LandingActions({ game }: LandingActionsProps) {
  const [progress, setProgress] = useState<GameSessionProgress | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedProgress = loadStoredProgress(game);
    setProgress(storedProgress);
    setIsHydrated(true);
  }, [game]);

  function handleStart() {
    try {
      const nextProgress = startNewProgress(game);
      setProgress(nextProgress);
      setStatusMessage(`Nová hra bola vytvorená. ID hry: ${shortSessionId(nextProgress.session_id)}.`);
    } catch {
      setStatusMessage("Novú hru sa nepodarilo uložiť v tomto prehliadači.");
    }
  }

  function handleContinue() {
    try {
      const nextProgress = continueStoredProgress(game);
      if (!nextProgress) {
        setProgress(null);
        setStatusMessage("Uložený postup sa nepodarilo načítať.");
        return;
      }

      setProgress(nextProgress);
      setStatusMessage(`Pokračuješ v uloženej hre ${shortSessionId(nextProgress.session_id)}.`);
    } catch {
      setStatusMessage("Pri načítaní uloženej hry nastal problém.");
    }
  }

  function handleRestart() {
    const shouldRestart = window.confirm(
      "Naozaj chcete vymazať uložený progres a začať znovu od prvého checkpointu?"
    );

    if (!shouldRestart) {
      return;
    }

    try {
      const nextProgress = restartProgress(game);
      setProgress(nextProgress);
      setStatusMessage(
        `Hra bola resetovaná. Začína nová hra s ID ${shortSessionId(nextProgress.session_id)}.`
      );
    } catch {
      setStatusMessage("Hru sa nepodarilo resetovať v tomto prehliadači.");
    }
  }

  if (!isHydrated) {
    return (
      <section className="panel-card">
        <p className="eyebrow">Pripravené</p>
        <h2 className="section-title">Chvíľu strpenia</h2>
        <p className="section-copy">Pripravujem tvoju hru v tomto zariadení.</p>
      </section>
    );
  }

  const hasStoredProgress = progress !== null;
  const activeCheckpointTitle = getActiveCheckpointTitle(game, progress);
  const completedCount = getCompletedCount(progress);

  return (
    <section className="panel-card">
      <p className="eyebrow">{hasStoredProgress ? "Pokračovanie" : "Začiatok hry"}</p>
      <h2 className="section-title">
        {hasStoredProgress ? "Môžeš pokračovať" : "Môžeš začať"}
      </h2>
      <p className="section-copy">
        {hasStoredProgress
          ? "Na tomto zariadení je uložená rozhraná hra. Pokračuj od posledného aktívneho stanovišťa alebo začni odznova."
          : "Po štarte sa hra uloží priamo do tohto prehliadača, takže sa k nej môžeš neskôr vrátiť."}
      </p>

      <div style={buttonRowStyle}>
        {hasStoredProgress ? (
          <>
            <button style={primaryButtonStyle} type="button" onClick={handleContinue}>
              Pokračovať v hre
            </button>
            <button style={secondaryButtonStyle} type="button" onClick={handleRestart}>
              Začať odznova
            </button>
          </>
        ) : (
          <button style={primaryButtonStyle} type="button" onClick={handleStart}>
            Začať hru
          </button>
        )}
      </div>

      {statusMessage ? (
        <p role="status" style={statusTextStyle}>
          {statusMessage}
        </p>
      ) : null}

      {progress ? (
        <div key={progress.session_id} style={infoCardStyle}>
          <div className="meta-grid" style={{ marginTop: 0 }}>
            <div className="meta-item">
              <span className="meta-label">ID hry</span>
              <span className="meta-value">{shortSessionId(progress.session_id)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Kam budeš pokračovať</span>
              <span className="meta-value">{activeCheckpointTitle}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Hotové stanovištia</span>
              <span className="meta-value">
                {completedCount} / {game.checkpoints.length}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Uloženie</span>
              <span className="meta-value">V tomto zariadení</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
