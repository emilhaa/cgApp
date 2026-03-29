"use client";

import { useEffect, useState } from "react";
import { deriveCheckpointOverviewItems, deriveCheckpointOverviewSummary, getInitialSelectableCheckpointId } from "@/src/core/gameLogic";
import { loadStoredProgress } from "@/src/core/progress";
import type { CheckpointOverviewItem, CheckpointOverviewState } from "@/src/core/gameLogic";
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
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);

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
        <p className="section-copy">Načítavam stav tvojej hry v tomto zariadení.</p>
      </section>
    );
  }

  const items = deriveCheckpointOverviewItems(game, progress);
  const summary = deriveCheckpointOverviewSummary(items);
  const effectiveSelectedCheckpointId = selectedCheckpointId ?? getInitialSelectableCheckpointId(items);
  const selectedItem = items.find((item) => item.checkpoint.id === effectiveSelectedCheckpointId) ?? null;

  return (
    <>
      <section className="panel-card">
        <p className="eyebrow">Prehľad checkpointov</p>
        <h2 className="section-title">Stav tvojej hry</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Aktívny checkpoint</span>
            <strong className="summary-value">
              {summary.activeCheckpoint ? summary.activeCheckpoint.title : "Zatiaľ žiadny"}
            </strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Hotové / preskočené</span>
            <strong className="summary-value">{summary.completedCount}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Zostáva</span>
            <strong className="summary-value">{summary.remainingCount}</strong>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <h2 className="section-title">Checkpointy v poradí</h2>
        <div className="checkpoint-list">
          {items.map((item) => {
            const cardClassName = `checkpoint-card checkpoint-card--${item.state}`;
            const isSelected = item.checkpoint.id === effectiveSelectedCheckpointId;

            if (!item.isClickable) {
              return (
                <div className={cardClassName} key={item.checkpoint.id}>
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
                </div>
              );
            }

            return (
              <button
                className={`${cardClassName}${isSelected ? " checkpoint-card--selected" : ""}`}
                key={item.checkpoint.id}
                onClick={() => setSelectedCheckpointId(item.checkpoint.id)}
                type="button"
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
              </button>
            );
          })}
        </div>
      </section>

      {selectedItem ? (
        <section className="panel-card">
          <p className="eyebrow">Vybraný checkpoint</p>
          <h2 className="section-title">{selectedItem.checkpoint.title}</h2>
          <div className="overview-detail">
            <p className="section-copy">
              <strong>Stav:</strong> {getStateLabel(selectedItem.state)}
            </p>
            <p className="section-copy">
              <strong>Kam ideš:</strong> {selectedItem.checkpoint.locationText}
            </p>
            <p className="section-copy">
              <strong>Krátke intro:</strong> {selectedItem.checkpoint.storyBeat}
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
