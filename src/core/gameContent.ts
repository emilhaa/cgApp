import fs from "node:fs";
import path from "node:path";
import rawGameContent from "@/src/content/game.sk.json";
import { validateGameContent } from "@/src/core/contentValidation";
import type { ContentIssue, GameContentLoadResult } from "@/src/types/game";

function collectAssetWarnings(warnings: ContentIssue[]) {
  for (const checkpoint of rawGameContent.checkpoints) {
    const mediaItems = Array.isArray(checkpoint.task?.media) ? checkpoint.task.media : [];

    for (const mediaItem of mediaItems) {
      if (typeof mediaItem?.src !== "string" || mediaItem.src.length === 0) {
        continue;
      }

      const relativeMediaPath = mediaItem.src.replace(/^\//, "");
      const absoluteMediaPath = path.join(process.cwd(), "public", relativeMediaPath);

      if (!fs.existsSync(absoluteMediaPath)) {
        warnings.push({
          path: `checkpoints[${checkpoint.id}].task.media`,
          message: `Referenced media file is missing in public/: ${mediaItem.src}`
        });
      }
    }
  }
}

export function getGameContent(): GameContentLoadResult {
  const validation = validateGameContent(rawGameContent);

  if (!validation.ok || !validation.data) {
    return {
      ok: false,
      errors: validation.errors
    };
  }

  const warnings = [...validation.warnings];
  collectAssetWarnings(warnings);

  return {
    ok: true,
    game: validation.data,
    warnings
  };
}
