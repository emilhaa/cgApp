import type {
  Checkpoint,
  GameContent,
  GameSessionProgress,
  GameTask,
  Location,
  SessionCheckpointStatus
} from "@/src/types/game";

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

export interface FinishSummary {
  totalCheckpointCount: number;
  doneCount: number;
  skippedCount: number;
  totalHintsUsed: number;
  totalShownSolutions: number;
  totalWrongAttempts: number;
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

export function getNextCheckpoint(game: GameContent, checkpointId: string): Checkpoint | null {
  const currentIndex = game.checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
  if (currentIndex === -1) {
    return null;
  }

  return game.checkpoints[currentIndex + 1] ?? null;
}

export function normalizeCodeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isCodeAnswerCorrect(expectedAnswer: string, submittedAnswer: string): boolean {
  return normalizeCodeAnswer(expectedAnswer) === normalizeCodeAnswer(submittedAnswer);
}

export function isMultipleChoiceAnswerCorrect(expectedAnswer: string, selectedAnswer: string | null): boolean {
  if (!selectedAnswer) {
    return false;
  }

  return expectedAnswer === selectedAnswer;
}

export function isSequenceAnswerCorrect(expectedOrder: string[], submittedOrder: string[]): boolean {
  if (expectedOrder.length !== submittedOrder.length) {
    return false;
  }

  return expectedOrder.every((item, index) => submittedOrder[index] === item);
}

export function moveSequenceItem(items: string[], index: number, direction: "up" | "down"): string[] {
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(index, 1);

  nextItems.splice(nextIndex, 0, movedItem);
  return nextItems;
}

export function getTaskHints(task: GameTask): string[] {
  const normalizedHints = [
    ...(Array.isArray(task.hints) ? task.hints : []),
    ...(task.hint1 ? [task.hint1] : []),
    ...(task.hint2 ? [task.hint2] : [])
  ]
    .map((hint) => hint.trim())
    .filter((hint) => hint.length > 0);

  return normalizedHints.filter((hint, index) => normalizedHints.indexOf(hint) === index).slice(0, 2);
}

export function buildOpenStreetMapEmbedUrl(location: Location): string {
  const latOffset = 0.0026;
  const lngOffset = 0.0038;
  const left = String(location.lng - lngOffset);
  const bottom = String(location.lat - latOffset);
  const right = String(location.lng + lngOffset);
  const top = String(location.lat + latOffset);
  const marker = `${location.lat},${location.lng}`;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(left)},${encodeURIComponent(bottom)},${encodeURIComponent(right)},${encodeURIComponent(top)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

export function buildNavigationUrl(
  location: Location,
  locationText: string,
  platform: "ios" | "default"
): string {
  const destination = `${location.lat},${location.lng}`;

  if (platform === "ios") {
    const params = new URLSearchParams({
      daddr: destination,
      dirflg: "w",
      q: location.label ?? locationText
    });

    return `https://maps.apple.com/?${params.toString()}`;
  }

  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "walking"
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function isLikelyIOSUserAgent(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function calculateDistanceMeters(origin: Location, target: Location): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(target.lat - origin.lat);
  const deltaLng = toRadians(target.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
    + Math.cos(originLat) * Math.cos(targetLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(earthRadiusMeters * arc);
}

export function formatApproximateDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${distanceMeters} m`;
}

export function getDistanceFeedback(distanceMeters: number): string {
  if (distanceMeters <= 50) {
    return "Si na mieste.";
  }

  if (distanceMeters <= 180) {
    return "Si blízko cieľa.";
  }

  return "Si ešte ďalej od cieľa.";
}

export function deriveFinishSummary(game: GameContent, progress: GameSessionProgress): FinishSummary {
  return {
    totalCheckpointCount: game.checkpoints.length,
    doneCount: progress.checkpoints.filter((checkpoint) => checkpoint.status === "done").length,
    skippedCount: progress.checkpoints.filter((checkpoint) => checkpoint.status === "skipped").length,
    totalHintsUsed: progress.checkpoints.reduce((total, checkpoint) => total + checkpoint.usedHintCount, 0),
    totalShownSolutions: progress.checkpoints.filter((checkpoint) => checkpoint.solutionShown).length,
    totalWrongAttempts: progress.checkpoints.reduce((total, checkpoint) => total + checkpoint.wrongAttemptCount, 0)
  };
}
