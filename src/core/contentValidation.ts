import type {
  Checkpoint,
  CodeTask,
  ContentIssue,
  ContentValidationResult,
  GameContent,
  GameRoute,
  GameTask,
  Location,
  MediaItem,
  MultipleChoiceTask,
  PhotoPoseTask,
  PhotoVerificationConfig,
  PhotoVerifyConfig,
  SequenceTask,
  TaskType
} from "@/src/types/game";

const SUPPORTED_TASK_TYPES: TaskType[] = ["code", "multiple_choice", "sequence", "photo_pose"];

type UnknownRecord = Record<string, unknown>;
type TaskHintFields = {
  hints?: string[];
  hint1?: string;
  hint2?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeIdPrefix(order: number): string {
  return `cp-${String(order).padStart(2, "0")}`;
}

function pushError(errors: ContentIssue[], path: string, message: string) {
  errors.push({ path, message });
}

function pushWarning(warnings: ContentIssue[], path: string, message: string) {
  warnings.push({ path, message });
}

function validateMediaItem(value: unknown, path: string, errors: ContentIssue[]): MediaItem | null {
  if (!isRecord(value)) {
    pushError(errors, path, "Media item must be an object.");
    return null;
  }

  if (value.type !== "image") {
    pushError(errors, `${path}.type`, "Only image media items are supported.");
    return null;
  }

  if (!isNonEmptyString(value.src)) {
    pushError(errors, `${path}.src`, "Media item src must be a non-empty string.");
    return null;
  }

  if (value.alt !== undefined && typeof value.alt !== "string") {
    pushError(errors, `${path}.alt`, "Media item alt must be a string when present.");
    return null;
  }

  return {
    type: "image",
    src: value.src,
    alt: typeof value.alt === "string" ? value.alt : undefined
  };
}

function validateLocation(value: unknown, path: string, errors: ContentIssue[]): Location | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    pushError(errors, path, "Location must be an object.");
    return undefined;
  }

  if (!isNumber(value.lat)) {
    pushError(errors, `${path}.lat`, "Location lat must be a valid number.");
  }

  if (!isNumber(value.lng)) {
    pushError(errors, `${path}.lng`, "Location lng must be a valid number.");
  }

  if (value.label !== undefined && typeof value.label !== "string") {
    pushError(errors, `${path}.label`, "Location label must be a string when present.");
  }

  if (!isNumber(value.lat) || !isNumber(value.lng)) {
    return undefined;
  }

  return {
    lat: value.lat,
    lng: value.lng,
    label: typeof value.label === "string" ? value.label : undefined
  };
}

function validateRoutePoint(value: unknown, path: string, errors: ContentIssue[]): Location | null {
  if (!isRecord(value)) {
    pushError(errors, path, "Route point must be an object.");
    return null;
  }

  if (!isNumber(value.lat)) {
    pushError(errors, `${path}.lat`, "Route point lat must be a valid number.");
  }

  if (!isNumber(value.lng)) {
    pushError(errors, `${path}.lng`, "Route point lng must be a valid number.");
  }

  if (!isNumber(value.lat) || !isNumber(value.lng)) {
    return null;
  }

  return {
    lat: value.lat,
    lng: value.lng
  };
}

function validateHints(task: UnknownRecord, path: string, errors: ContentIssue[]): TaskHintFields {
  if (task.hints !== undefined && !isStringArray(task.hints)) {
    pushError(errors, `${path}.hints`, "Task hints must be an array of strings when present.");
  }

  if (task.hint1 !== undefined && typeof task.hint1 !== "string") {
    pushError(errors, `${path}.hint1`, "Task hint1 must be a string when present.");
  }

  if (task.hint2 !== undefined && typeof task.hint2 !== "string") {
    pushError(errors, `${path}.hint2`, "Task hint2 must be a string when present.");
  }

  return {
    hints: isStringArray(task.hints) ? task.hints : undefined,
    hint1: typeof task.hint1 === "string" ? task.hint1 : undefined,
    hint2: typeof task.hint2 === "string" ? task.hint2 : undefined
  };
}

function validatePhotoVerifyConfig(
  value: unknown,
  path: string,
  errors: ContentIssue[]
): PhotoVerifyConfig | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    pushError(errors, path, "Photo verify config must be an object.");
    return undefined;
  }

  if (!isStringArray(value.requirements) || value.requirements.length === 0) {
    pushError(errors, `${path}.requirements`, "Photo verify requirements must be a non-empty string array.");
  }

  if (
    value.pass_confidence !== undefined &&
    (!isNumber(value.pass_confidence) || value.pass_confidence < 0 || value.pass_confidence > 1)
  ) {
    pushError(errors, `${path}.pass_confidence`, "Photo verify pass_confidence must be a number between 0 and 1.");
  }

  if (
    value.max_attempts !== undefined &&
    (!Number.isInteger(value.max_attempts) || (value.max_attempts as number) < 1)
  ) {
    pushError(errors, `${path}.max_attempts`, "Photo verify max_attempts must be a positive integer when present.");
  }

  if (!isStringArray(value.requirements) || value.requirements.length === 0) {
    return undefined;
  }

  return {
    requirements: value.requirements,
    pass_confidence:
      isNumber(value.pass_confidence) && value.pass_confidence >= 0 && value.pass_confidence <= 1
        ? value.pass_confidence
        : undefined,
    max_attempts: Number.isInteger(value.max_attempts) ? (value.max_attempts as number) : undefined
  };
}

function validatePhotoVerificationConfig(
  value: unknown,
  path: string,
  errors: ContentIssue[]
): PhotoVerificationConfig | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    pushError(errors, path, "Photo verification config must be an object.");
    return undefined;
  }

  if (value.mode !== "pose_match") {
    pushError(errors, `${path}.mode`, 'Photo verification mode must be "pose_match".');
    return undefined;
  }

  return {
    mode: "pose_match"
  };
}

function validateTask(value: unknown, path: string, errors: ContentIssue[], warnings: ContentIssue[]): GameTask | null {
  if (!isRecord(value)) {
    pushError(errors, path, "Task must be an object.");
    return null;
  }

  if (!SUPPORTED_TASK_TYPES.includes(value.type as TaskType)) {
    pushError(
      errors,
      `${path}.type`,
      `Task type must be one of: ${SUPPORTED_TASK_TYPES.join(", ")}.`
    );
    return null;
  }

  if (!isNonEmptyString(value.question)) {
    pushError(errors, `${path}.question`, "Task question must be a non-empty string.");
  }

  if (!isNonEmptyString(value.failsafe)) {
    pushError(errors, `${path}.failsafe`, "Task failsafe must be a non-empty string.");
  }

  const media: MediaItem[] = [];
  if (value.media !== undefined) {
    if (!Array.isArray(value.media)) {
      pushError(errors, `${path}.media`, "Task media must be an array when present.");
    } else {
      value.media.forEach((item, index) => {
        const parsedItem = validateMediaItem(item, `${path}.media[${index}]`, errors);
        if (parsedItem) {
          media.push(parsedItem);
        }
      });
    }
  }

  const hintFields = validateHints(value, path, errors);
  const commonFields = {
    question: isNonEmptyString(value.question) ? value.question : "",
    failsafe: isNonEmptyString(value.failsafe) ? value.failsafe : "",
    media,
    ...hintFields
  };

  switch (value.type) {
    case "code": {
      if (!isNonEmptyString(value.answer)) {
        pushError(errors, `${path}.answer`, "Code task answer must be a non-empty string.");
        return null;
      }

      const task: CodeTask = {
        ...commonFields,
        type: "code",
        answer: value.answer
      };

      return task;
    }
    case "multiple_choice": {
      if (!isStringArray(value.options) || value.options.length < 2) {
        pushError(
          errors,
          `${path}.options`,
          "Multiple choice task options must be an array of at least 2 strings."
        );
        return null;
      }

      if (!isNonEmptyString(value.answer)) {
        pushError(errors, `${path}.answer`, "Multiple choice task answer must be a non-empty string.");
        return null;
      }

      if (!value.options.includes(value.answer)) {
        pushError(errors, `${path}.answer`, "Multiple choice answer must be present in options.");
        return null;
      }

      if (value.options.length < 3 || value.options.length > 4) {
        pushWarning(
          warnings,
          `${path}.options`,
          "Multiple choice task has a non-standard option count for the MVP target (expected 3-4)."
        );
      }

      const task: MultipleChoiceTask = {
        ...commonFields,
        type: "multiple_choice",
        options: value.options,
        answer: value.answer
      };

      return task;
    }
    case "sequence": {
      if (!isStringArray(value.sequenceItems) || value.sequenceItems.length === 0) {
        pushError(errors, `${path}.sequenceItems`, "Sequence task sequenceItems must be a non-empty string array.");
        return null;
      }

      if (!isStringArray(value.answer) || value.answer.length !== value.sequenceItems.length) {
        pushError(
          errors,
          `${path}.answer`,
          "Sequence task answer must be a string array with the same length as sequenceItems."
        );
        return null;
      }

      const expected = [...value.sequenceItems].sort();
      const actual = [...value.answer].sort();
      const matchesPermutation = expected.every((item, index) => item === actual[index]);

      if (!matchesPermutation) {
        pushError(errors, `${path}.answer`, "Sequence task answer must be a permutation of sequenceItems.");
        return null;
      }

      const task: SequenceTask = {
        ...commonFields,
        type: "sequence",
        sequenceItems: value.sequenceItems,
        answer: value.answer
      };

      return task;
    }
    case "photo_pose": {
      if (!isNonEmptyString(value.hint1)) {
        pushError(errors, `${path}.hint1`, "Photo pose task hint1 must be a non-empty string.");
        return null;
      }

      const verification = validatePhotoVerificationConfig(value.verification, `${path}.verification`, errors);
      const verify = validatePhotoVerifyConfig(value.verify, `${path}.verify`, errors);

      const task: PhotoPoseTask = {
        ...commonFields,
        type: "photo_pose",
        verification,
        verify
      };

      return task;
    }
    default: {
      pushError(errors, `${path}.type`, "Unsupported task type.");
      return null;
    }
  }
}

function validateCheckpoint(
  value: unknown,
  path: string,
  errors: ContentIssue[],
  warnings: ContentIssue[]
): Checkpoint | null {
  if (!isRecord(value)) {
    pushError(errors, path, "Checkpoint must be an object.");
    return null;
  }

  if (!isNonEmptyString(value.id)) {
    pushError(errors, `${path}.id`, "Checkpoint id must be a non-empty string.");
  }

  if (!Number.isInteger(value.order)) {
    pushError(errors, `${path}.order`, "Checkpoint order must be an integer.");
  }

  if (!isNonEmptyString(value.title)) {
    pushError(errors, `${path}.title`, "Checkpoint title must be a non-empty string.");
  }

  if (!isNonEmptyString(value.storyBeat)) {
    pushError(errors, `${path}.storyBeat`, "Checkpoint storyBeat must be a non-empty string.");
  }

  if (!isNonEmptyString(value.microGuide)) {
    pushError(errors, `${path}.microGuide`, "Checkpoint microGuide must be a non-empty string.");
  }

  if (!isNonEmptyString(value.locationText)) {
    pushError(errors, `${path}.locationText`, "Checkpoint locationText must be a non-empty string.");
  }

  const location = validateLocation(value.location, `${path}.location`, errors);
  const task = validateTask(value.task, `${path}.task`, errors, warnings);

  if (
    typeof value.id === "string" &&
    Number.isInteger(value.order) &&
    !value.id.startsWith(normalizeIdPrefix(value.order as number))
  ) {
    pushWarning(
      warnings,
      `${path}.id`,
      "Checkpoint id prefix does not match checkpoint order."
    );
  }

  if (!isNonEmptyString(value.id) || !Number.isInteger(value.order) || !task) {
    return null;
  }

  return {
    id: value.id,
    order: value.order as number,
    title: isNonEmptyString(value.title) ? value.title : "",
    storyBeat: isNonEmptyString(value.storyBeat) ? value.storyBeat : "",
    microGuide: isNonEmptyString(value.microGuide) ? value.microGuide : "",
    locationText: isNonEmptyString(value.locationText) ? value.locationText : "",
    location,
    task
  };
}

function validateRoute(
  value: unknown,
  path: string,
  errors: ContentIssue[]
): GameRoute | null {
  if (!isRecord(value)) {
    pushError(errors, path, "Route must be an object.");
    return null;
  }

  if (!isNonEmptyString(value.fromId)) {
    pushError(errors, `${path}.fromId`, "Route fromId must be a non-empty string.");
  }

  if (!isNonEmptyString(value.toId)) {
    pushError(errors, `${path}.toId`, "Route toId must be a non-empty string.");
  }

  if (!Array.isArray(value.points)) {
    pushError(errors, `${path}.points`, "Route points must be an array with at least 2 points.");
  }

  const points: Location[] = [];
  if (Array.isArray(value.points)) {
    if (value.points.length < 2) {
      pushError(errors, `${path}.points`, "Route points must contain at least 2 points.");
    }

    value.points.forEach((pointValue, index) => {
      const point = validateRoutePoint(pointValue, `${path}.points[${index}]`, errors);

      if (point) {
        points.push(point);
      }
    });
  }

  if (value.distanceM !== undefined && (!isNumber(value.distanceM) || value.distanceM <= 0)) {
    pushError(errors, `${path}.distanceM`, "Route distanceM must be a number greater than 0 when present.");
  }

  if (!isNonEmptyString(value.fromId) || !isNonEmptyString(value.toId) || points.length < 2) {
    return null;
  }

  return {
    fromId: value.fromId,
    toId: value.toId,
    distanceM: isNumber(value.distanceM) && value.distanceM > 0 ? value.distanceM : undefined,
    points
  };
}

function addRecoveredContentWarnings(game: GameContent, warnings: ContentIssue[]) {
  const cp09 = game.checkpoints.find((checkpoint) => checkpoint.id === "cp-09-dolna");
  if (
    cp09 &&
    cp09.task.type !== "photo_pose" &&
    cp09.task.question.toLowerCase().includes("fotku")
  ) {
    pushWarning(
      warnings,
      "checkpoints[cp-09-dolna].task",
      "Recovered content looks inconsistent: the prompt reads like a photo task, but the stored task type is not photo_pose."
    );
  }

  const suspiciousRecoveredLocations = [
    { id: "cp-10-katarina", lat: 48.1472, lng: 17.126946 },
    { id: "cp-10-stary", lat: 48.1472, lng: 17.126946 }
  ];

  for (const entry of suspiciousRecoveredLocations) {
    const checkpoint = game.checkpoints.find((item) => item.id === entry.id);
    if (
      checkpoint?.location &&
      checkpoint.location.lat === entry.lat &&
      checkpoint.location.lng === entry.lng
    ) {
      pushWarning(
        warnings,
        `checkpoints[${entry.id}].location`,
        "Recovered location coordinates look suspicious compared with earlier checkpoints and should be manually reviewed."
      );
    }
  }
}

export function validateGameContent(value: unknown): ContentValidationResult {
  const errors: ContentIssue[] = [];
  const warnings: ContentIssue[] = [];

  if (!isRecord(value)) {
    pushError(errors, "game", "Game content root must be an object.");
    return { ok: false, errors, warnings };
  }

  if (!isNonEmptyString(value.id)) {
    pushError(errors, "game.id", "Game id must be a non-empty string.");
  }

  if (!isNonEmptyString(value.title)) {
    pushError(errors, "game.title", "Game title must be a non-empty string.");
  }

  if (!isNonEmptyString(value.duration)) {
    pushError(errors, "game.duration", "Game duration must be a non-empty string.");
  }

  if (!isNonEmptyString(value.language)) {
    pushError(errors, "game.language", "Game language must be a non-empty string.");
  }

  if (!Array.isArray(value.checkpoints) || value.checkpoints.length === 0) {
    pushError(errors, "game.checkpoints", "Game checkpoints must be a non-empty array.");
  }

  const checkpoints: Checkpoint[] = [];
  if (Array.isArray(value.checkpoints)) {
    value.checkpoints.forEach((checkpointValue, index) => {
      const checkpoint = validateCheckpoint(
        checkpointValue,
        `game.checkpoints[${index}]`,
        errors,
        warnings
      );

      if (checkpoint) {
        checkpoints.push(checkpoint);
      }
    });
  }

  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const checkpoint of checkpoints) {
    if (ids.has(checkpoint.id)) {
      pushError(errors, "game.checkpoints", `Duplicate checkpoint id found: ${checkpoint.id}.`);
    }
    ids.add(checkpoint.id);

    if (orders.has(checkpoint.order)) {
      pushError(errors, "game.checkpoints", `Duplicate checkpoint order found: ${checkpoint.order}.`);
    }
    orders.add(checkpoint.order);
  }

  const routes: GameRoute[] = [];
  if (value.routes !== undefined) {
    if (!Array.isArray(value.routes)) {
      pushError(errors, "game.routes", "Game routes must be an array when present.");
    } else {
      value.routes.forEach((routeValue, index) => {
        const route = validateRoute(routeValue, `game.routes[${index}]`, errors);

        if (route) {
          routes.push(route);
        }
      });
    }
  }

  const routePairs = new Set<string>();
  for (const route of routes) {
    if (!ids.has(route.fromId)) {
      pushError(errors, "game.routes", `Route fromId does not match an existing checkpoint: ${route.fromId}.`);
    }

    if (!ids.has(route.toId)) {
      pushError(errors, "game.routes", `Route toId does not match an existing checkpoint: ${route.toId}.`);
    }

    const routeKey = `${route.fromId}::${route.toId}`;
    if (routePairs.has(routeKey)) {
      pushError(errors, "game.routes", `Duplicate route pair found: ${route.fromId} -> ${route.toId}.`);
    }

    routePairs.add(routeKey);
  }

  const sortedOrders = [...checkpoints]
    .map((checkpoint) => checkpoint.order)
    .sort((left, right) => left - right);
  sortedOrders.forEach((order, index) => {
    const expectedOrder = index + 1;
    if (order !== expectedOrder) {
      pushError(errors, "game.checkpoints", "Checkpoint orders must be continuous and start at 1.");
    }
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings
    };
  }

  const game: GameContent = {
    id: value.id as string,
    title: value.title as string,
    duration: value.duration as string,
    language: value.language as string,
    checkpoints,
    routes
  };

  addRecoveredContentWarnings(game, warnings);

  return {
    ok: true,
    data: game,
    errors,
    warnings
  };
}
