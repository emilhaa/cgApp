export type TaskType = "code" | "multiple_choice" | "sequence" | "photo_pose";

export type MediaType = "image";

export interface MediaItem {
  type: MediaType;
  src: string;
  alt?: string;
}

export interface Location {
  lat: number;
  lng: number;
  label?: string;
}

interface TaskBase {
  type: TaskType;
  question: string;
  failsafe: string;
  media?: MediaItem[];
  hints?: string[];
  hint1?: string;
  hint2?: string;
}

export interface CodeTask extends TaskBase {
  type: "code";
  answer: string;
}

export interface MultipleChoiceTask extends TaskBase {
  type: "multiple_choice";
  options: string[];
  answer: string;
}

export interface SequenceTask extends TaskBase {
  type: "sequence";
  sequenceItems: string[];
  answer: string[];
}

export interface PhotoVerifyConfig {
  requirements: string[];
  pass_confidence?: number;
  max_attempts?: number;
}

export interface PhotoPoseTask extends TaskBase {
  type: "photo_pose";
  verify?: PhotoVerifyConfig;
}

export type GameTask = CodeTask | MultipleChoiceTask | SequenceTask | PhotoPoseTask;

export interface Checkpoint {
  id: string;
  order: number;
  title: string;
  storyBeat: string;
  microGuide: string;
  locationText: string;
  location?: Location;
  task: GameTask;
}

export interface GameContent {
  id: string;
  title: string;
  duration: string;
  language: string;
  checkpoints: Checkpoint[];
}

export type SessionCheckpointStatus = "locked" | "active" | "done" | "skipped";

export type SessionCheckpointPhase = "go" | "solve" | "reveal";

export interface SessionCheckpointProgress {
  checkpointId: string;
  status: SessionCheckpointStatus;
  phase: SessionCheckpointPhase;
  usedHintCount: number;
  solutionShown: boolean;
  wrongAttemptCount: number;
}

export interface GameSessionProgress {
  version: 1;
  gameId: string;
  session_id: string;
  startedAt: string;
  updatedAt: string;
  activeCheckpointId: string;
  resumeCheckpointId: string;
  isCompleted: boolean;
  completedAt: string | null;
  checkpoints: SessionCheckpointProgress[];
}

export interface ContentIssue {
  path: string;
  message: string;
}

export interface ContentValidationResult {
  ok: boolean;
  data?: GameContent;
  errors: ContentIssue[];
  warnings: ContentIssue[];
}

export interface GameContentLoadSuccess {
  ok: true;
  game: GameContent;
  warnings: ContentIssue[];
}

export interface GameContentLoadFailure {
  ok: false;
  errors: ContentIssue[];
}

export type GameContentLoadResult = GameContentLoadSuccess | GameContentLoadFailure;
