import type { Checkpoint, GameContent, GameSessionProgress, SessionCheckpointStatus } from "@/src/types/game";

export type CheckpointOverviewState = SessionCheckpointStatus;

export interface CheckpointOverviewItem {
  checkpoint: Checkpoint;
  state: CheckpointOverviewState;
  isClickable: boolean;
}

export interface CheckpointOverviewSummary {
  activeCheckpoint: Checkpoint | null;
  completedCount: number;
  remainingCount: number;
}

function getFallbackStateForIndex(index: number): CheckpointOverviewState {
  return index === 0 ? "active" : "locked";
}

export function deriveCheckpointOverviewItems(
  game: GameContent,
  progress: GameSessionProgress | null
): CheckpointOverviewItem[] {
  const storedStates = progress
    ? new Map(progress.checkpoints.map((checkpointState) => [checkpointState.checkpointId, checkpointState.status]))
    : null;

  return game.checkpoints.map((checkpoint, index) => {
    const state = storedStates?.get(checkpoint.id) ?? getFallbackStateForIndex(index);

    return {
      checkpoint,
      state,
      isClickable: state === "active" || state === "done" || state === "skipped"
    };
  });
}

export function deriveCheckpointOverviewSummary(
  items: CheckpointOverviewItem[]
): CheckpointOverviewSummary {
  const activeCheckpoint = items.find((item) => item.state === "active")?.checkpoint ?? null;
  const completedCount = items.filter((item) => item.state === "done" || item.state === "skipped").length;
  const remainingCount = items.length - completedCount;

  return {
    activeCheckpoint,
    completedCount,
    remainingCount
  };
}

export function getInitialSelectableCheckpointId(items: CheckpointOverviewItem[]): string | null {
  return items.find((item) => item.state === "active")?.checkpoint.id
    ?? items.find((item) => item.isClickable)?.checkpoint.id
    ?? null;
}
