import type {
  GameContent,
  GameSessionProgress,
  SessionCheckpointPhase,
  SessionCheckpointProgress,
  SessionCheckpointStatus
} from "@/src/types/game";
import { getNextCheckpoint, getTaskHints } from "@/src/core/gameLogic";

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

function getDefaultCheckpointUiState() {
  return {
    usedHintCount: 0,
    solutionShown: false,
    wrongAttemptCount: 0
  };
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCheckpointState(
  value: unknown,
  expectedCheckpointId: string
): SessionCheckpointProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.checkpointId !== expectedCheckpointId) {
    return null;
  }

  if (!VALID_CHECKPOINT_STATUSES.includes(value.status as SessionCheckpointStatus)) {
    return null;
  }

  if (!VALID_CHECKPOINT_PHASES.includes(value.phase as SessionCheckpointPhase)) {
    return null;
  }

  const usedHintCount = typeof value.usedHintCount === "number" && Number.isInteger(value.usedHintCount) && value.usedHintCount >= 0
    ? value.usedHintCount
    : 0;

  const solutionShown = typeof value.solutionShown === "boolean" ? value.solutionShown : false;
  const wrongAttemptCount =
    typeof value.wrongAttemptCount === "number" && Number.isInteger(value.wrongAttemptCount) && value.wrongAttemptCount >= 0
      ? value.wrongAttemptCount
      : 0;

  return {
    checkpointId: expectedCheckpointId,
    status: value.status as SessionCheckpointStatus,
    phase: value.phase as SessionCheckpointPhase,
    usedHintCount,
    solutionShown,
    wrongAttemptCount
  };
}

function normalizeStoredProgress(value: unknown, game: GameContent): GameSessionProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== STORAGE_VERSION) {
    return null;
  }

  if (value.gameId !== game.id) {
    return null;
  }

  if (typeof value.session_id !== "string" || value.session_id.length === 0) {
    return null;
  }

  if (typeof value.startedAt !== "string" || typeof value.updatedAt !== "string") {
    return null;
  }

  if (typeof value.activeCheckpointId !== "string" || value.activeCheckpointId.length === 0) {
    return null;
  }

  if (!Array.isArray(value.checkpoints) || value.checkpoints.length !== game.checkpoints.length) {
    return null;
  }

  const activeStates: SessionCheckpointProgress[] = [];
  let allCheckpointsCompleted = true;
  const normalizedCheckpoints: SessionCheckpointProgress[] = [];

  for (const [index, checkpointState] of value.checkpoints.entries()) {
    const expectedCheckpointId = game.checkpoints[index]?.id ?? "";
    const normalizedCheckpointState = normalizeCheckpointState(checkpointState, expectedCheckpointId);

    if (!normalizedCheckpointState) {
      return null;
    }

    normalizedCheckpoints.push(normalizedCheckpointState);

    if (normalizedCheckpointState.status === "active") {
      activeStates.push(normalizedCheckpointState);
    }

    if (normalizedCheckpointState.status !== "done" && normalizedCheckpointState.status !== "skipped") {
      allCheckpointsCompleted = false;
    }
  }

  const derivedCompletedState = activeStates.length === 0 && allCheckpointsCompleted;
  const isCompleted = typeof value.isCompleted === "boolean" ? value.isCompleted || derivedCompletedState : derivedCompletedState;
  const completedAt =
    isCompleted
      ? (typeof value.completedAt === "string" && value.completedAt.length > 0 ? value.completedAt : value.updatedAt)
      : null;

  if (activeStates.length === 1) {
    if (isCompleted) {
      return null;
    }

    if (activeStates[0].checkpointId !== value.activeCheckpointId) {
      return null;
    }

    return {
      version: STORAGE_VERSION,
      gameId: value.gameId,
      session_id: value.session_id,
      startedAt: value.startedAt,
      updatedAt: value.updatedAt,
      activeCheckpointId: value.activeCheckpointId,
      isCompleted,
      completedAt,
      checkpoints: normalizedCheckpoints
    };
  }

  if (activeStates.length === 0 && allCheckpointsCompleted) {
    return {
      version: STORAGE_VERSION,
      gameId: value.gameId,
      session_id: value.session_id,
      startedAt: value.startedAt,
      updatedAt: value.updatedAt,
      activeCheckpointId: value.activeCheckpointId,
      isCompleted: true,
      completedAt,
      checkpoints: normalizedCheckpoints
    };
  }

  return null;
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
    isCompleted: false,
    completedAt: null,
    checkpoints: game.checkpoints.map((checkpoint, index) => ({
      checkpointId: checkpoint.id,
      status: index === 0 ? "active" : "locked",
      phase: "go",
      ...getDefaultCheckpointUiState()
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
    return normalizeStoredProgress(parsedProgress, game);
  } catch {
    return null;
  }
}

function getCurrentProgress(game: GameContent): GameSessionProgress {
  return loadStoredProgress(game) ?? createInitialProgress(game);
}

function buildAdvancedCheckpointProgress(
  game: GameContent,
  currentProgress: GameSessionProgress,
  checkpointId: string,
  nextStatus: "done" | "skipped"
): GameSessionProgress | null {
  const checkpointIndex = currentProgress.checkpoints.findIndex(
    (checkpoint) => checkpoint.checkpointId === checkpointId
  );

  if (checkpointIndex === -1) {
    return null;
  }

  const currentCheckpoint = currentProgress.checkpoints[checkpointIndex];
  if (currentCheckpoint.status !== "active") {
    return null;
  }

  const nextCheckpoint = getNextCheckpoint(game, checkpointId);
  const timestamp = createTimestamp();
  const isCompleted = nextCheckpoint === null;

  return {
    ...currentProgress,
    updatedAt: timestamp,
    activeCheckpointId: nextCheckpoint ? nextCheckpoint.id : checkpointId,
    isCompleted,
    completedAt: isCompleted ? timestamp : null,
    checkpoints: currentProgress.checkpoints.map((checkpointState, index) => {
      if (index === checkpointIndex) {
        return {
          ...checkpointState,
          status: nextStatus,
          phase: "reveal"
        };
      }

      if (
        nextCheckpoint &&
        checkpointState.checkpointId === nextCheckpoint.id &&
        checkpointState.status === "locked"
      ) {
        return {
          ...checkpointState,
          status: "active",
          phase: "go"
        };
      }

      return checkpointState;
    })
  };
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

export function completeCheckpoint(game: GameContent, checkpointId: string): GameSessionProgress | null {
  const currentProgress = getCurrentProgress(game);
  const nextProgress = buildAdvancedCheckpointProgress(game, currentProgress, checkpointId, "done");

  if (!nextProgress) {
    return null;
  }

  persistProgress(nextProgress);
  return nextProgress;
}

export function revealNextHint(game: GameContent, checkpointId: string): GameSessionProgress | null {
  const currentProgress = getCurrentProgress(game);
  const checkpointIndex = currentProgress.checkpoints.findIndex(
    (checkpoint) => checkpoint.checkpointId === checkpointId
  );

  if (checkpointIndex === -1) {
    return null;
  }

  const currentCheckpoint = currentProgress.checkpoints[checkpointIndex];
  const checkpointDefinition = game.checkpoints.find((checkpoint) => checkpoint.id === checkpointId);

  if (!checkpointDefinition || currentCheckpoint.status !== "active") {
    return null;
  }

  const availableHints = getTaskHints(checkpointDefinition.task);
  if (availableHints.length === 0 || currentCheckpoint.usedHintCount >= availableHints.length) {
    return currentProgress;
  }

  const nextProgress: GameSessionProgress = {
    ...currentProgress,
    updatedAt: createTimestamp(),
    checkpoints: currentProgress.checkpoints.map((checkpointState, index) => {
      if (index !== checkpointIndex) {
        return checkpointState;
      }

      return {
        ...checkpointState,
        usedHintCount: checkpointState.usedHintCount + 1
      };
    })
  };

  persistProgress(nextProgress);
  return nextProgress;
}

export function revealCheckpointSolution(game: GameContent, checkpointId: string): GameSessionProgress | null {
  const currentProgress = getCurrentProgress(game);
  const checkpointIndex = currentProgress.checkpoints.findIndex(
    (checkpoint) => checkpoint.checkpointId === checkpointId
  );

  if (checkpointIndex === -1) {
    return null;
  }

  const currentCheckpoint = currentProgress.checkpoints[checkpointIndex];
  if (currentCheckpoint.status !== "active") {
    return null;
  }

  if (currentCheckpoint.solutionShown) {
    return currentProgress;
  }

  const nextProgress: GameSessionProgress = {
    ...currentProgress,
    updatedAt: createTimestamp(),
    checkpoints: currentProgress.checkpoints.map((checkpointState, index) => {
      if (index !== checkpointIndex) {
        return checkpointState;
      }

      return {
        ...checkpointState,
        solutionShown: true
      };
    })
  };

  persistProgress(nextProgress);
  return nextProgress;
}

export function skipCheckpoint(game: GameContent, checkpointId: string): GameSessionProgress | null {
  const currentProgress = getCurrentProgress(game);
  const nextProgress = buildAdvancedCheckpointProgress(game, currentProgress, checkpointId, "skipped");

  if (!nextProgress) {
    return null;
  }

  persistProgress(nextProgress);
  return nextProgress;
}

export function recordWrongAttempt(game: GameContent, checkpointId: string): GameSessionProgress | null {
  const currentProgress = getCurrentProgress(game);
  const checkpointIndex = currentProgress.checkpoints.findIndex(
    (checkpoint) => checkpoint.checkpointId === checkpointId
  );

  if (checkpointIndex === -1) {
    return null;
  }

  const currentCheckpoint = currentProgress.checkpoints[checkpointIndex];
  if (currentCheckpoint.status !== "active") {
    return null;
  }

  const nextProgress: GameSessionProgress = {
    ...currentProgress,
    updatedAt: createTimestamp(),
    checkpoints: currentProgress.checkpoints.map((checkpointState, index) => {
      if (index !== checkpointIndex) {
        return checkpointState;
      }

      return {
        ...checkpointState,
        wrongAttemptCount: checkpointState.wrongAttemptCount + 1
      };
    })
  };

  persistProgress(nextProgress);
  return nextProgress;
}
