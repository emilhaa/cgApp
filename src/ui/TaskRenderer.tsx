"use client";

import { useEffect, useState } from "react";
import {
  getTaskHints,
  isCodeAnswerCorrect,
  isMultipleChoiceAnswerCorrect,
  isSequenceAnswerCorrect,
  moveSequenceItem
} from "@/src/core/gameLogic";
import { isImageFile, preparePhotoForTask } from "@/src/core/photoProcessing";
import type { Checkpoint, PhotoVerifyResponse, SessionCheckpointProgress } from "@/src/types/game";

type CompletionResult = {
  ok: boolean;
  message?: string;
};

type CompletionPayload = {
  photoProvided?: boolean;
  photoPreview?: string | null;
};

type FeedbackState = {
  tone: "error" | "success";
  message: string;
};

type TaskRendererProps = {
  checkpoint: Checkpoint;
  checkpointProgress: SessionCheckpointProgress;
  gameId: string;
  onComplete: (payload?: CompletionPayload) => CompletionResult;
  onPhotoVerifyResult: (result: PhotoVerifyResponse) => CompletionResult;
  onRevealHint: () => CompletionResult;
  onRevealSolution: () => CompletionResult;
  onSavePhoto: (payload: CompletionPayload) => CompletionResult;
  onSkip: () => CompletionResult;
  onWrongAttempt: () => void;
  sessionId: string | null;
};

function TaskMedia({ checkpoint }: { checkpoint: Checkpoint }) {
  const mediaItems = checkpoint.task.media ?? [];
  const [failedMediaSources, setFailedMediaSources] = useState<string[]>([]);

  if (mediaItems.length === 0) {
    return null;
  }

  return (
    <div className="task-media-grid">
      {mediaItems.map((mediaItem) => {
        if (failedMediaSources.includes(mediaItem.src)) {
          return (
            <section className="support-card support-card--warning" key={mediaItem.src}>
              <p className="section-copy">Obrázok sa nepodarilo načítať: {mediaItem.src}</p>
            </section>
          );
        }

        return (
          <figure className="task-media-card" key={mediaItem.src}>
            <img
              alt={mediaItem.alt ?? checkpoint.title}
              className="task-media-image"
              onError={() =>
                setFailedMediaSources((currentSources) =>
                  currentSources.includes(mediaItem.src) ? currentSources : [...currentSources, mediaItem.src]
                )
              }
              src={mediaItem.src}
            />
            {mediaItem.alt ? <figcaption className="task-media-caption">{mediaItem.alt}</figcaption> : null}
          </figure>
        );
      })}
    </div>
  );
}

export function TaskRenderer({
  checkpoint,
  checkpointProgress,
  gameId,
  onComplete,
  onPhotoVerifyResult,
  onRevealHint,
  onRevealSolution,
  onSavePhoto,
  onSkip,
  onWrongAttempt,
  sessionId
}: TaskRendererProps) {
  const [codeAnswer, setCodeAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sequenceOrder, setSequenceOrder] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [storedPhotoPreview, setStoredPhotoPreview] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState(false);
  const [isSkipConfirming, setIsSkipConfirming] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const availableHints = getTaskHints(checkpoint.task);
  const visibleHints = availableHints.slice(0, checkpointProgress.usedHintCount);
  const nextHintNumber = checkpointProgress.usedHintCount + 1;
  const canRevealNextHint = checkpointProgress.usedHintCount < availableHints.length;

  useEffect(() => {
    setCodeAnswer("");
    setSelectedOption(null);
    setSequenceOrder(checkpoint.task.type === "sequence" ? [...checkpoint.task.sequenceItems] : []);
    setPhotoPreview(checkpointProgress.photoPreview ?? null);
    setStoredPhotoPreview(checkpointProgress.photoPreview ?? null);
    setPhotoFileName(null);
    setIsPreparingPhoto(false);
    setIsVerifyingPhoto(false);
    setIsSkipConfirming(false);
    setFeedback(null);
  }, [checkpoint.id]);

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
      setPhotoPreview(null);
      setStoredPhotoPreview(null);
      setPhotoFileName(null);
      setFeedback({
        tone: "error",
        message: "Vyber prosím obrázok alebo fotku z kamery."
      });
      return;
    }

    setIsPreparingPhoto(true);

    try {
      const preparedPhoto = await preparePhotoForTask(file);

      setPhotoPreview(preparedPhoto.previewUrl);
      setStoredPhotoPreview(preparedPhoto.storedPreview);
      setPhotoFileName(file.name || "Vybraná fotka");
      setFeedback(null);
    } catch {
      setPhotoPreview(null);
      setStoredPhotoPreview(null);
      setPhotoFileName(null);
      setFeedback({
        tone: "error",
        message: "Fotku sa nepodarilo načítať. Skús ju vybrať ešte raz."
      });
    } finally {
      setIsPreparingPhoto(false);
    }
  }

  function finishTask(payload?: CompletionPayload) {
    const result = onComplete(payload);

    if (!result.ok) {
      setFeedback({
        tone: "error",
        message: result.message ?? "Progres sa nepodarilo uložiť. Skús obnoviť stránku."
      });
      return;
    }

    setFeedback(null);
  }

  function savePhotoForCheckpoint() {
    if (!photoPreview) {
      setFeedback({
        tone: "error",
        message: checkpointProgress.photoProvided
          ? "Pre nové overenie vyber fotku znova."
          : "Najprv pridaj alebo odfoť fotku."
      });
      return;
    }

    const result = onSavePhoto({
      photoProvided: true,
      photoPreview: storedPhotoPreview
    });

    if (!result.ok) {
      setFeedback({
        tone: "error",
        message: result.message ?? "Fotku sa nepodarilo uložiť pre tento checkpoint."
      });
      return;
    }

    setFeedback({
      tone: "success",
      message: "Fotka je pripravená na overenie."
    });
  }

  function handleRevealHint() {
    const result = onRevealHint();

    if (!result.ok) {
      setFeedback({
        tone: "error",
        message: result.message ?? "Hint sa nepodarilo zobraziť. Skús obnoviť stránku."
      });
      return;
    }

    setFeedback(null);
  }

  function handleRevealSolution() {
    const result = onRevealSolution();

    if (!result.ok) {
      setFeedback({
        tone: "error",
        message: result.message ?? "Riešenie sa nepodarilo zobraziť. Skús obnoviť stránku."
      });
      return;
    }

    setFeedback(null);
  }

  function handleSkipConfirm() {
    const result = onSkip();

    if (!result.ok) {
      setFeedback({
        tone: "error",
        message: result.message ?? "Checkpoint sa nepodarilo preskočiť. Skús obnoviť stránku."
      });
      return;
    }

    setFeedback(null);
    setIsSkipConfirming(false);
  }

  function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (checkpoint.task.type !== "code") {
      return;
    }

    if (codeAnswer.trim().length === 0) {
      setFeedback({
        tone: "error",
        message: "Zadaj odpoveď a skús to znova."
      });
      return;
    }

    if (!isCodeAnswerCorrect(checkpoint.task.answer, codeAnswer)) {
      onWrongAttempt();
      setFeedback({
        tone: "error",
        message: "To nie je správna odpoveď. Skús ešte raz."
      });
      return;
    }

    finishTask();
  }

  function handleMultipleChoiceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (checkpoint.task.type !== "multiple_choice") {
      return;
    }

    if (!selectedOption) {
      setFeedback({
        tone: "error",
        message: "Vyber jednu odpoveď."
      });
      return;
    }

    if (!isMultipleChoiceAnswerCorrect(checkpoint.task.answer, selectedOption)) {
      onWrongAttempt();
      setFeedback({
        tone: "error",
        message: "Táto možnosť nie je správna. Skús inú."
      });
      return;
    }

    finishTask();
  }

  function handleSequenceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (checkpoint.task.type !== "sequence") {
      return;
    }

    if (!isSequenceAnswerCorrect(checkpoint.task.answer, sequenceOrder)) {
      onWrongAttempt();
      setFeedback({
        tone: "error",
        message: "Poradie ešte nesedí. Skús položky upraviť."
      });
      return;
    }

    finishTask();
  }

  function handlePhotoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (checkpoint.task.type !== "photo_pose") {
      return;
    }

    if (!photoPreview) {
      setFeedback({
        tone: "error",
        message: "Najprv pridaj alebo odfoť fotku."
      });
      return;
    }

    savePhotoForCheckpoint();
  }

  async function handlePhotoVerify() {
    if (checkpoint.task.type !== "photo_pose") {
      return;
    }

    const maxAttempts = checkpoint.task.verify?.max_attempts ?? 5;
    const currentPreview = photoPreview;

    if (!currentPreview) {
      setFeedback({
        tone: "error",
        message: checkpointProgress.photoProvided
          ? "Fotku máš označenú ako pridanú, ale na nové overenie ju potrebuješ vybrať znova."
          : "Najprv vyber fotku, potom ju môžeš overiť."
      });
      return;
    }

    if (checkpointProgress.photoVerifyAttemptCount >= maxAttempts) {
      setFeedback({
        tone: "error",
        message: "Vyčerpal si počet pokusov na automatické overenie. Môžeš použiť nápovedu, riešenie alebo skip."
      });
      return;
    }

    setIsVerifyingPhoto(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/verify-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {})
        },
        body: JSON.stringify({
          gameId,
          checkpointId: checkpoint.id,
          imageDataUrl: currentPreview
        })
      });

      const payload = (await response.json().catch(() => null)) as PhotoVerifyResponse | null;
      if (!payload) {
        setFeedback({
          tone: "error",
          message: "Fotku sa teraz nepodarilo overiť. Skús to ešte raz."
        });
        return;
      }

      const shouldPersistResult = !payload.error_code || payload.blocked;

      if (shouldPersistResult) {
        const persistedResult = onPhotoVerifyResult(payload);
        if (!persistedResult.ok) {
          setFeedback({
            tone: "error",
            message: persistedResult.message ?? "Výsledok overenia sa nepodarilo uložiť."
          });
          return;
        }
      }

      if (payload.verdict === "pass") {
        const completionResult = onComplete({
          photoProvided: true,
          photoPreview: storedPhotoPreview
        });

        if (!completionResult.ok) {
          setFeedback({
            tone: "error",
            message: completionResult.message ?? "Fotka prešla overením, ale checkpoint sa nepodarilo dokončiť."
          });
          return;
        }

        return;
      }

      if (payload.error_code && !payload.blocked) {
        setFeedback({
          tone: "error",
          message: payload.feedback_sk
        });
        return;
      }

      if (!response.ok) {
        setFeedback({
          tone: "error",
          message: payload.feedback_sk
        });
        return;
      }

      setFeedback(null);
    } catch {
      setFeedback({
        tone: "error",
        message: "Fotku sa teraz nepodarilo overiť. Skús to ešte raz."
      });
    } finally {
      setIsVerifyingPhoto(false);
    }
  }

  return (
    <div className="detail-stack">
      <p className="section-copy">{checkpoint.task.question}</p>
      <TaskMedia checkpoint={checkpoint} />

      {visibleHints.length > 0 ? (
        <div className="support-stack">
          {visibleHints.map((hint, index) => (
            <section className="support-card" key={`${checkpoint.id}-hint-${index + 1}`}>
              <p className="eyebrow">Hint {index + 1}</p>
              <p className="section-copy">{hint}</p>
            </section>
          ))}
        </div>
      ) : null}

      {checkpointProgress.solutionShown ? (
        <section className="support-card support-card--warning">
          <p className="eyebrow">Riešenie</p>
          <p className="section-copy">{checkpoint.task.failsafe}</p>
        </section>
      ) : null}

      {checkpoint.task.type === "code" ? (
        <form className="detail-form" onSubmit={handleCodeSubmit}>
          <label className="field-label" htmlFor="checkpoint-answer">
            Tvoja odpoveď
          </label>
          <input
            className="text-input"
            id="checkpoint-answer"
            onChange={(event) => setCodeAnswer(event.target.value)}
            type="text"
            value={codeAnswer}
          />
          <button className="action-button" type="submit">
            Odoslať odpoveď
          </button>
        </form>
      ) : null}

      {checkpoint.task.type === "multiple_choice" ? (
        <form className="detail-form" onSubmit={handleMultipleChoiceSubmit}>
          <fieldset className="task-fieldset">
            <legend className="field-label">Vyber jednu možnosť</legend>
            <div className="option-list">
              {checkpoint.task.options.map((option) => (
                <label className="option-card" key={option}>
                  <input
                    checked={selectedOption === option}
                    name={`checkpoint-${checkpoint.id}`}
                    onChange={() => setSelectedOption(option)}
                    type="radio"
                    value={option}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="action-button" type="submit">
            Skontrolovať odpoveď
          </button>
        </form>
      ) : null}

      {checkpoint.task.type === "sequence" ? (
        <form className="detail-form" onSubmit={handleSequenceSubmit}>
          <ol className="sequence-list">
            {sequenceOrder.map((item, index) => (
              <li className="sequence-item" key={`${item}-${index}`}>
                <div className="sequence-copy">
                  <span className="sequence-number">{index + 1}</span>
                  <span>{item}</span>
                </div>
                <div className="sequence-controls">
                  <button
                    className="mini-action-button"
                    disabled={index === 0}
                    onClick={() => setSequenceOrder((currentItems) => moveSequenceItem(currentItems, index, "up"))}
                    type="button"
                  >
                    Hore
                  </button>
                  <button
                    className="mini-action-button"
                    disabled={index === sequenceOrder.length - 1}
                    onClick={() =>
                      setSequenceOrder((currentItems) => moveSequenceItem(currentItems, index, "down"))
                    }
                    type="button"
                  >
                    Dole
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button className="action-button" type="submit">
            Potvrdiť poradie
          </button>
        </form>
      ) : null}

      {checkpoint.task.type === "photo_pose" ? (
        <form className="detail-form" onSubmit={handlePhotoSubmit}>
          <label className="field-label" htmlFor="checkpoint-photo">
            Pridaj alebo odfoť fotku
          </label>
          <input
            accept="image/*"
            capture="environment"
            className="file-input"
            id="checkpoint-photo"
            onChange={handlePhotoChange}
            type="file"
          />
          <p className="section-copy">
            Fotka je dobrovoľná. Použije sa len pre túto úlohu. Hra funguje aj bez nej.
          </p>
          {isPreparingPhoto ? <p className="section-copy">Pripravujem náhľad fotky...</p> : null}
          {isVerifyingPhoto ? <p className="section-copy">Overujem fotku...</p> : null}
          {photoPreview ? (
            <figure className="photo-preview-card">
              <img alt="Náhľad vybranej fotky" className="photo-preview-image" src={photoPreview} />
              {photoFileName ? <figcaption className="task-media-caption">{photoFileName}</figcaption> : null}
            </figure>
          ) : null}
          {!photoPreview && !isPreparingPhoto ? (
            <p className="section-copy">Najprv vyber fotku, potom ju môžeš použiť pre tento checkpoint.</p>
          ) : null}
          {checkpointProgress.photoProvided && !checkpointProgress.photoPreview && !photoPreview ? (
            <p className="section-copy">
              Fotku si už pridal, ale kvôli veľkosti si ju pred ďalším overením treba vybrať znova.
            </p>
          ) : null}
          <p className="section-copy">
            Pokusy o overenie: {checkpointProgress.photoVerifyAttemptCount} / {checkpoint.task.verify?.max_attempts ?? 5}
          </p>
          {checkpointProgress.photoVerifyLastResult ? (
            <section
              className={
                checkpointProgress.photoVerifyLastResult.verdict === "fail" || checkpointProgress.photoVerifyLastResult.blocked
                  ? "support-card support-card--warning"
                  : "support-card"
              }
            >
              <p className="eyebrow">
                {checkpointProgress.photoVerifyLastResult.verdict === "pass"
                  ? "Overenie prešlo"
                  : checkpointProgress.photoVerifyLastResult.verdict === "fail"
                    ? "Overenie neprešlo"
                    : "Overenie si nie je isté"}
              </p>
              <p className="section-copy">{checkpointProgress.photoVerifyLastResult.feedback_sk}</p>
            </section>
          ) : null}
          <button className="secondary-action-button" disabled={isPreparingPhoto || isVerifyingPhoto || !photoPreview} type="submit">
            Použiť fotku
          </button>
          <button
            className="action-button"
            disabled={
              isPreparingPhoto
              || isVerifyingPhoto
              || !photoPreview
              || checkpointProgress.photoVerifyAttemptCount >= (checkpoint.task.verify?.max_attempts ?? 5)
            }
            onClick={handlePhotoVerify}
            type="button"
          >
            Overiť fotku
          </button>
        </form>
      ) : null}

      <div className="support-actions">
        {canRevealNextHint ? (
          <button className="secondary-action-button" onClick={handleRevealHint} type="button">
            Zobraziť Hint {nextHintNumber}
          </button>
        ) : null}

        {!checkpointProgress.solutionShown ? (
          <button className="secondary-action-button" onClick={handleRevealSolution} type="button">
            Zobraziť riešenie
          </button>
        ) : null}

        {!isSkipConfirming ? (
          <button className="secondary-action-button" onClick={() => setIsSkipConfirming(true)} type="button">
            Preskočiť checkpoint
          </button>
        ) : null}
      </div>

      {isSkipConfirming ? (
        <section className="support-card support-card--warning">
          <p className="section-copy">
            Naozaj chceš tento checkpoint preskočiť? Označí sa ako preskočený a odomkne sa ďalší.
          </p>
          <div className="support-actions">
            <button className="secondary-action-button" onClick={handleSkipConfirm} type="button">
              Áno, preskočiť
            </button>
            <button className="secondary-action-button" onClick={() => setIsSkipConfirming(false)} type="button">
              Nie, zostať tu
            </button>
          </div>
        </section>
      ) : null}

      {feedback ? <p className={`feedback-box feedback-box--${feedback.tone}`}>{feedback.message}</p> : null}
    </div>
  );
}
