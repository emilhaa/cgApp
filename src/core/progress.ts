import type {
  GameContent,
  GameSessionProgress,
  SessionCheckpointPhase,
  SessionCheckpointProgress,
  SessionCheckpointStatus
} from "@/src/types/game";

const STORAGE_KEY = "city-game-stiavnica:progress";
const STORAGE_VERSION = 1 as const;

const VALID_CHECKPOINT_STATUSES: SessionCheckpointStatus[] = ["locked", "active", "done", "skipped"];
const VALID_CHECKPOINT_PHASES: SessionCheckpointPhase[] = ["go", "solve", "reveal"];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createTimestamp() {
  return new Date().toISOString();
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidCheckpointState(value: unknown, expectedCheckpointId: string): value is SessionCheckpointProgress {
  if (!isRecord(value)) {
    return false;
  }

  if (value.checkpointId !== expectedCheckpointId) {
    return false;
  }

  if (!VALID_CHECKPOINT_STATUSES.includes(value.status as SessionCheckpointStatus)) {
    return false;
  }

  if (!VALID_CHECKPOINT_PHASES.includes(value.phase as SessionCheckpointPhase)) {
    return false;
  }

  return true;
}

function isValidStoredProgress(value: unknown, game: GameContent): value is GameSessionProgress {
  if (!isRecord(value)) {
    return false;
  }

  if (value.version !== STORAGE_VERSION) {
    return false;
  }

  if (value.gameId !== game.id) {
    return false;
  }

  if (typeof value.session_id !== "string" || value.session_id.length === 0) {
    return false;
  }

  if (typeof value.startedAt !== "string" || typeof value.updatedAt !== "string") {
    return false;
  }

  if (typeof value.activeCheckpointId !== "string" || value.activeCheckpointId.length === 0) {
    return false;
  }

  if (!Array.isArray(value.checkpoints) || value.checkpoints.length !== game.checkpoints.length) {
    return false;
  }

  const activeStates: SessionCheckpointProgress[] = [];
  for (const [index, checkpointState] of value.checkpoints.entries()) {
    const expectedCheckpointId = game.checkpoints[index]?.id ?? "";
    if (!isValidCheckpointState(checkpointState, expectedCheckpointId)) {
      return false;
    }

    if (checkpointState.status === "active") {
      activeStates.push(checkpointState);
    }
  }

  if (activeStates.length !== 1) {
    return false;
  }

  if (activeStates[0].checkpointId !== value.activeCheckpointId) {
    return false;
  }

  return true;
}

function persistProgress(progress: GameSessionProgress) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function touchProgress(progress: GameSessionProgress): GameSessionProgress {
  return {
    ...progress,
    updatedAt: createTimestamp()
  };
}

export function createInitialProgress(game: GameContent): GameSessionProgress {
  const firstCheckpoint = game.checkpoints[0];

  if (!firstCheckpoint) {
    throw new Error("Cannot create progress without at least one checkpoint.");
  }

  const timestamp = createTimestamp();

  return {
    version: STORAGE_VERSION,
    gameId: game.id,
    session_id: createSessionId(),
    startedAt: timestamp,
    updatedAt: timestamp,
    activeCheckpointId: firstCheckpoint.id,
    checkpoints: game.checkpoints.map((checkpoint, index) => ({
      checkpointId: checkpoint.id,
      status: index === 0 ? "active" : "locked",
      phase: "go"
    }))
  };
}

export function loadStoredProgress(game: GameContent): GameSessionProgress | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const rawProgress = window.localStorage.getItem(STORAGE_KEY);
  if (!rawProgress) {
    return null;
  }

  try {
    const parsedProgress: unknown = JSON.parse(rawProgress);
    return isValidStoredProgress(parsedProgress, game) ? parsedProgress : null;
  } catch {
    return null;
  }
}

export function startNewProgress(game: GameContent): GameSessionProgress {
  const progress = createInitialProgress(game);
  persistProgress(progress);
  return progress;
}

export function continueStoredProgress(game: GameContent): GameSessionProgress | null {
  const progress = loadStoredProgress(game);
  if (!progress) {
    return null;
  }

  const touchedProgress = touchProgress(progress);
  persistProgress(touchedProgress);
  return touchedProgress;
}

export function restartProgress(game: GameContent): GameSessionProgress {
  const progress = createInitialProgress(game);
  persistProgress(progress);
  return progress;
}
