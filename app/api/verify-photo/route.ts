import { NextResponse } from "next/server";
import rawGameContent from "@/src/content/game.sk.json";
import { validateGameContent } from "@/src/core/contentValidation";
import type { Checkpoint, PhotoPoseTask, PhotoVerifyResponse } from "@/src/types/game";

export const runtime = "nodejs";

const validationResult = validateGameContent(rawGameContent);

const OPENAI_API_URL = "https://api.openai.com/v1";
const VISION_MODEL = "gpt-4o-mini";
const MODERATION_MODEL = "omni-moderation-latest";
const DEFAULT_PASS_CONFIDENCE = 0.75;
const DEFAULT_MAX_ATTEMPTS = 5;
const MAX_REQUEST_BYTES = 2_500_000;
const MAX_IMAGE_DATA_URL_LENGTH = 2_000_000;
const ATTEMPT_TTL_MS = 6 * 60 * 60 * 1000;

const DEFAULT_REQUIREMENTS = [
  "Na fotke musi byt viditelny hrac aj socha alebo cielovy objekt.",
  "Hrac sa ma snazit napodobnit celkovy postoj alebo pozu objektu.",
  "Na PASS staci zretelna priblizna zhoda postoja, nie presna podobnost detailov."
];

const verifyAttemptStore = new Map<string, { count: number; updatedAt: number }>();

type VerifyPhotoRequest = {
  gameId?: unknown;
  checkpointId?: unknown;
  imageDataUrl?: unknown;
};

function jsonResponse(payload: PhotoVerifyResponse, status = 200) {
  return NextResponse.json(payload, { status });
}

function buildErrorResponse(
  feedback_sk: string,
  error_code: string,
  status = 200,
  blocked = false
) {
  return jsonResponse(
    {
      verdict: "unsure",
      confidence: 0,
      feedback_sk,
      blocked,
      error_code
    },
    status
  );
}

function isPhotoPoseCheckpoint(checkpoint: Checkpoint): checkpoint is Checkpoint & { task: PhotoPoseTask } {
  return checkpoint.task.type === "photo_pose";
}

function getPhotoCheckpoint(gameId: string, checkpointId: string) {
  if (!validationResult.ok || !validationResult.data) {
    return null;
  }

  if (validationResult.data.id !== gameId) {
    return null;
  }

  const checkpoint = validationResult.data.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint || !isPhotoPoseCheckpoint(checkpoint)) {
    return null;
  }

  return checkpoint;
}

function resolveVerifyConfig(task: PhotoPoseTask) {
  return {
    requirements: task.verify?.requirements?.length ? task.verify.requirements : DEFAULT_REQUIREMENTS,
    passConfidence: task.verify?.pass_confidence ?? DEFAULT_PASS_CONFIDENCE,
    maxAttempts: task.verify?.max_attempts ?? DEFAULT_MAX_ATTEMPTS
  };
}

function cleanupAttemptStore() {
  const now = Date.now();

  for (const [key, value] of verifyAttemptStore.entries()) {
    if (now - value.updatedAt > ATTEMPT_TTL_MS) {
      verifyAttemptStore.delete(key);
    }
  }
}

function getAttemptKey(request: Request, gameId: string, checkpointId: string) {
  const sessionId = request.headers.get("x-session-id")?.trim();

  if (!sessionId) {
    return null;
  }

  return `${gameId}:${checkpointId}:${sessionId}`;
}

function enforceAttemptLimit(request: Request, gameId: string, checkpointId: string, maxAttempts: number) {
  cleanupAttemptStore();

  const attemptKey = getAttemptKey(request, gameId, checkpointId);
  if (!attemptKey) {
    return { ok: true as const };
  }

  const currentAttempt = verifyAttemptStore.get(attemptKey);
  if (currentAttempt && currentAttempt.count >= maxAttempts) {
    return { ok: false as const };
  }

  verifyAttemptStore.set(attemptKey, {
    count: (currentAttempt?.count ?? 0) + 1,
    updatedAt: Date.now()
  });

  return { ok: true as const };
}

function extractResponseText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim().length > 0) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];

  for (const item of output) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const contentItem of content) {
      if (typeof contentItem !== "object" || contentItem === null) {
        continue;
      }

      const contentRecord = contentItem as Record<string, unknown>;
      if (typeof contentRecord.text === "string" && contentRecord.text.trim().length > 0) {
        return contentRecord.text;
      }
    }
  }

  return null;
}

function parseVerifierOutput(payload: unknown): PhotoVerifyResponse | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const verdict = record.verdict;
  const confidence = record.confidence;
  const feedback = record.feedback_sk;

  if (verdict !== "pass" && verdict !== "fail" && verdict !== "unsure") {
    return null;
  }

  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return null;
  }

  if (typeof feedback !== "string" || feedback.trim().length === 0) {
    return null;
  }

  return {
    verdict,
    confidence: Math.max(0, Math.min(1, confidence)),
    feedback_sk: feedback.trim()
  };
}

async function moderateImage(apiKey: string, imageDataUrl: string) {
  if (process.env.PHOTO_MODERATION === "0") {
    return { ok: true as const, blocked: false };
  }

  const response = await fetch(`${OPENAI_API_URL}/moderations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODERATION_MODEL,
      input: [
        {
          type: "image_url",
          image_url: {
            url: imageDataUrl
          }
        }
      ]
    })
  });

  if (!response.ok) {
    return { ok: false as const };
  }

  const payload = await response.json();
  const results = Array.isArray((payload as { results?: unknown[] }).results)
    ? ((payload as { results?: unknown[] }).results as Array<Record<string, unknown>>)
    : [];
  const flagged = results.some((item) => item.flagged === true);

  return {
    ok: true as const,
    blocked: flagged
  };
}

async function verifyPhotoWithVision(
  apiKey: string,
  checkpoint: Checkpoint & { task: PhotoPoseTask },
  imageDataUrl: string
) {
  const verifyConfig = resolveVerifyConfig(checkpoint.task);
  const requirementsText = verifyConfig.requirements.map((item) => `- ${item}`).join("\n");

  const systemPrompt = [
    "You verify a mobile city game photo task.",
    "Judge only whether the quest completion conditions are met.",
    "Never identify a person, guess identity, age, gender, ethnicity, or any biometric trait.",
    "Evaluate only whether the player and the statue are visible and whether the player's pose broadly matches the statue pose.",
    "If the image is too unclear, framed badly, or the pose match is uncertain, return verdict 'unsure'.",
    "Return only JSON that matches the provided schema."
  ].join(" ");

  const userPrompt = [
    `Checkpoint: ${checkpoint.title}`,
    `Question: ${checkpoint.task.question}`,
    "Quest-specific requirements:",
    requirementsText,
    `PASS threshold: confidence must be at least ${verifyConfig.passConfidence}.`,
    "Rubric:",
    "- pass: player and statue/object are visible and the pose broadly matches.",
    "- fail: one or more key requirements are clearly not met.",
    "- unsure: the image is ambiguous, partially hidden, blurry, or confidence is below the pass threshold.",
    "Write actionable feedback in Slovak."
  ].join("\n");

  const response = await fetch(`${OPENAI_API_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userPrompt
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "photo_pose_verdict",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              verdict: {
                type: "string",
                enum: ["pass", "fail", "unsure"]
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1
              },
              feedback_sk: {
                type: "string"
              }
            },
            required: ["verdict", "confidence", "feedback_sk"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const outputText = extractResponseText(payload);
  if (!outputText) {
    return null;
  }

  try {
    const parsed = parseVerifierOutput(JSON.parse(outputText));

    if (!parsed) {
      return null;
    }

    if (parsed.verdict === "pass" && parsed.confidence < verifyConfig.passConfidence) {
      return {
        verdict: "unsure" as const,
        confidence: parsed.confidence,
        feedback_sk: "Fotka je blízko, ale overenie si ešte nie je isté. Skús záber so zreteľnejšou pózou a viditeľnou sochou."
      };
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

  if (typeof contentLength === "number" && Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return buildErrorResponse(
      "Fotka je príliš veľká na overenie. Skús ju odfotiť alebo vybrať znova v menšom rozlíšení.",
      "payload_too_large",
      413
    );
  }

  const body = (await request.json().catch(() => null)) as VerifyPhotoRequest | null;
  if (!body || typeof body.gameId !== "string" || typeof body.checkpointId !== "string" || typeof body.imageDataUrl !== "string") {
    return buildErrorResponse("Požiadavku na overenie sa nepodarilo spracovať.", "invalid_request", 400);
  }

  if (!body.imageDataUrl.startsWith("data:image/")) {
    return buildErrorResponse("Na overenie potrebuješ vybrať platnú fotku.", "invalid_image", 400);
  }

  if (body.imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return buildErrorResponse(
      "Fotka je príliš veľká na overenie. Skús ju vybrať znova alebo spraviť nový záber.",
      "payload_too_large",
      413
    );
  }

  const checkpoint = getPhotoCheckpoint(body.gameId, body.checkpointId);
  if (!checkpoint) {
    return buildErrorResponse("Tento foto checkpoint sa nepodarilo pripraviť na overenie.", "checkpoint_not_found", 404);
  }

  const verifyConfig = resolveVerifyConfig(checkpoint.task);
  const attemptLimit = enforceAttemptLimit(request, body.gameId, body.checkpointId, verifyConfig.maxAttempts);
  if (!attemptLimit.ok) {
    return buildErrorResponse(
      "Vyčerpal si počet pokusov na automatické overenie. Môžeš skúsiť nápovedu, riešenie alebo checkpoint preskočiť.",
      "max_attempts_reached"
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildErrorResponse(
      "Automatické overenie teraz nie je dostupné. Môžeš skúsiť nápovedu alebo checkpoint dokončiť inou cestou.",
      "missing_api_key"
    );
  }

  const moderationResult = await moderateImage(apiKey, body.imageDataUrl);
  if (!moderationResult.ok) {
    return buildErrorResponse(
      "Fotku sa teraz nepodarilo bezpečne skontrolovať. Skús to prosím ešte raz o chvíľu.",
      "moderation_unavailable"
    );
  }

  if (moderationResult.blocked) {
    return buildErrorResponse(
      "Túto fotku sa teraz nepodarilo prijať na automatické overenie. Skús iný záber alebo pokračuj cez nápovedu či skip.",
      "moderation_blocked",
      200,
      true
    );
  }

  const verificationResult = await verifyPhotoWithVision(apiKey, checkpoint, body.imageDataUrl);
  if (!verificationResult) {
    return buildErrorResponse(
      "Fotku sa nepodarilo spoľahlivo overiť. Skús záber so zreteľnejšou postavou aj sochou.",
      "verification_unavailable"
    );
  }

  return jsonResponse(verificationResult);
}
