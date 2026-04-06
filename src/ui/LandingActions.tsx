"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearStoredProgress,
  continueStoredProgress,
  loadStoredProgress,
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

const infoValueStyle = {
  margin: "6px 0 0",
  fontSize: "1.05rem",
  fontWeight: 700
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

function getActiveCheckpointTitle(game: GameContent, progress: GameSessionProgress | null) {
  if (progress?.isCompleted) {
    return "Hra dokončená";
  }

  const activeCheckpointId = progress?.resumeCheckpointId ?? progress?.activeCheckpointId ?? game.checkpoints[0]?.id;
  const activeCheckpoint = game.checkpoints.find((checkpoint) => checkpoint.id === activeCheckpointId);
  return activeCheckpoint?.title ?? game.checkpoints[0]?.title ?? "Prvý checkpoint";
}

export function LandingActions({ game }: LandingActionsProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<GameSessionProgress | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isOpeningCheckpoint, setIsOpeningCheckpoint] = useState(false);

  useEffect(() => {
    const storedProgress = loadStoredProgress(game);
    setProgress(storedProgress);
    setIsHydrated(true);
  }, [game]);

  function handleStart() {
    try {
      const nextProgress = startNewProgress(game);
      setIsOpeningCheckpoint(true);
      setStatusMessage(null);
      router.replace(`/checkpoints/${nextProgress.activeCheckpointId}`);
    } catch {
      setIsOpeningCheckpoint(false);
      setStatusMessage("Hru sa teraz nepodarilo pripraviť. Skús to prosím znova.");
    }
  }

  function handleContinue() {
    try {
      const nextProgress = continueStoredProgress(game);
      if (!nextProgress) {
        setProgress(null);
        setIsOpeningCheckpoint(false);
        setStatusMessage("Nepodarilo sa nadviazať na predchádzajúcu hru.");
        return;
      }

      setIsOpeningCheckpoint(true);
      setStatusMessage(null);
      router.replace(`/checkpoints/${nextProgress.resumeCheckpointId}`);
    } catch {
      setIsOpeningCheckpoint(false);
      setStatusMessage("Pokračovanie sa teraz nepodarilo otvoriť. Skús to prosím znova.");
    }
  }

  function handleRestart() {
    const shouldRestart = window.confirm("Naozaj chceš začať odznova? Vrátiš sa na prvý checkpoint.");

    if (!shouldRestart) {
      return;
    }

    try {
      clearStoredProgress();
      setProgress(null);
      setStatusMessage(null);
      router.push("/");
    } catch {
      setStatusMessage("Hru sa teraz nepodarilo začať odznova. Skús to prosím znova.");
    }
  }

  if (!isHydrated) {
    return (
      <section className="panel-card">
        <p className="eyebrow">Pripravené</p>
        <h2 className="section-title">Chvíľu strpenia</h2>
        <p className="section-copy">Pripravujem tvoju hru.</p>
      </section>
    );
  }

  if (isOpeningCheckpoint) {
    return (
      <section className="panel-card">
        <p className="eyebrow">Hra sa začína</p>
        <h2 className="section-title">Otváram checkpoint</h2>
        <p className="section-copy">Chvíľu strpenia, presúvam ťa na miesto, kde máš pokračovať.</p>
      </section>
    );
  }

  const hasStoredProgress = progress !== null;
  const isCompleted = progress?.isCompleted ?? false;
  const activeCheckpointTitle = getActiveCheckpointTitle(game, progress);

  return (
    <section className="panel-card">
      <p className="eyebrow">
        {isCompleted ? "Dokončené" : hasStoredProgress ? "Pokračovanie" : "Začiatok hry"}
      </p>
      <h2 className="section-title">
        {isCompleted ? "Hra je už dohraná" : hasStoredProgress ? "Môžeš pokračovať" : "Spusti hru"}
      </h2>
      <p className="section-copy">
        {isCompleted
          ? "Tvoja hra je úspešne dohraná. Môžeš si pozrieť výsledok alebo sa vydať na trasu znova."
          : hasStoredProgress
          ? "Na trase na teba čaká ďalší checkpoint. Môžeš pokračovať alebo sa vrátiť na začiatok."
          : "Keď budeš pripravený, vyraz na prvý checkpoint."}
      </p>

      <div style={buttonRowStyle}>
        {isCompleted ? (
          <>
            <Link href="/finish" style={primaryButtonStyle}>
              Pozrieť výsledok hry
            </Link>
            <button style={secondaryButtonStyle} type="button" onClick={handleRestart}>
              Začať odznova
            </button>
          </>
        ) : hasStoredProgress ? (
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
            Spustiť hru
          </button>
        )}
      </div>

      {statusMessage ? (
        <p role="status" style={statusTextStyle}>
          {statusMessage}
        </p>
      ) : null}

      {progress ? (
        <div style={infoCardStyle}>
          <span className="meta-label">{isCompleted ? "Stav hry" : "Ďalší checkpoint"}</span>
          <p style={infoValueStyle}>{activeCheckpointTitle}</p>
        </div>
      ) : null}
    </section>
  );
}
