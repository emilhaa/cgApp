import type {
  Checkpoint,
  GameContent,
  GameRoute,
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

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
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
  const currentCheckpoint = game.checkpoints.find((checkpoint) => checkpoint.id === checkpointId);
  if (!currentCheckpoint) {
    return null;
  }

  return game.checkpoints.find((checkpoint) => checkpoint.order === currentCheckpoint.order + 1) ?? null;
}

export function getPrevCheckpoint(game: GameContent, checkpointId: string): Checkpoint | null {
  const currentCheckpoint = game.checkpoints.find((checkpoint) => checkpoint.id === checkpointId);
  if (!currentCheckpoint) {
    return null;
  }

  return game.checkpoints.find((checkpoint) => checkpoint.order === currentCheckpoint.order - 1) ?? null;
}

export function getRouteSegment(game: GameContent, fromId: string, toId: string): GameRoute | null {
  return game.routes?.find((route) => route.fromId === fromId && route.toId === toId) ?? null;
}

export const findRouteSegment = getRouteSegment;

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

export function buildBoundsForLocations(locations: Location[]): MapBounds {
  const latitudes = locations.map((location) => location.lat);
  const longitudes = locations.map((location) => location.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPadding = Math.max((maxLat - minLat) * 0.18, 0.0012);
  const lngPadding = Math.max((maxLng - minLng) * 0.18, 0.0015);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding
  };
}

export function buildOpenStreetMapEmbedUrlForBounds(bounds: MapBounds): string {
  const left = String(bounds.minLng);
  const bottom = String(bounds.minLat);
  const right = String(bounds.maxLng);
  const top = String(bounds.maxLat);

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(left)},${encodeURIComponent(bottom)},${encodeURIComponent(right)},${encodeURIComponent(top)}&layer=mapnik`;
}

export function buildOpenStreetMapEmbedUrl(location: Location): string {
  return buildOpenStreetMapEmbedUrlForBounds(buildBoundsForLocations([location]));
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

export function calculatePathDistanceMeters(points: Location[]): number {
  if (points.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let index = 1; index < points.length; index += 1) {
    totalDistance += calculateDistanceMeters(points[index - 1], points[index]);
  }

  return totalDistance;
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
