"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deriveCheckpointOverviewItems } from "@/src/core/gameLogic";
import { loadStoredProgress } from "@/src/core/progress";
import type { CheckpointOverviewState } from "@/src/core/gameLogic";
import type { GameContent, GameSessionProgress } from "@/src/types/game";

type CheckpointOverviewProps = {
  game: GameContent;
};

function getStateLabel(state: CheckpointOverviewState) {
  switch (state) {
    case "active":
      return "Aktívny";
    case "done":
      return "Hotový";
    case "skipped":
      return "Preskočený";
    case "locked":
    default:
      return "Zamknutý";
  }
}

export function CheckpointOverview({ game }: CheckpointOverviewProps) {
  const [progress, setProgress] = useState<GameSessionProgress | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedProgress = loadStoredProgress(game);
    setProgress(storedProgress);
    setIsHydrated(true);
  }, [game]);

  if (!isHydrated) {
    return (
      <section className="panel-card">
        <p className="eyebrow">Prehľad checkpointov</p>
        <h2 className="section-title">Pripravujem prehľad</h2>
        <p className="section-copy">Načítavam tvoj postup.</p>
      </section>
    );
  }

  const items = deriveCheckpointOverviewItems(game, progress).filter((item) => item.state !== "locked");

  return (
    <section className="panel-card">
      <h2 className="section-title">Checkpointy</h2>
      <div className="checkpoint-list">
        {items.map((item) => {
          const cardClassName = `checkpoint-card checkpoint-card--${item.state}`;

          return (
            <Link
              className={`${cardClassName} checkpoint-card--interactive`}
              href={`/checkpoints/${item.checkpoint.id}`}
              key={item.checkpoint.id}
            >
              <div className="checkpoint-row">
                <div>
                  <p className="checkpoint-order">Checkpoint {item.checkpoint.order}</p>
                  <h3 className="checkpoint-title">{item.checkpoint.title}</h3>
                </div>
                <span className={`state-badge state-badge--${item.state}`}>
                  {getStateLabel(item.state)}
                </span>
              </div>
              <p className="checkpoint-copy">{item.checkpoint.locationText}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
