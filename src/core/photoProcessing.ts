export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

const MAX_PREVIEW_SIDE_PX = 1280;
const JPEG_QUALITY = 0.7;
const MAX_STORED_PREVIEW_LENGTH = 250_000;

type PreparedPhoto = {
  previewUrl: string;
  storedPreview: string | null;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Photo preview could not be created."));
    };

    reader.onerror = () => {
      reject(new Error("Photo preview could not be created."));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo preview could not be created."));
    image.src = dataUrl;
  });
}

function getScaledSize(width: number, height: number) {
  const longestSide = Math.max(width, height);

  if (longestSide <= MAX_PREVIEW_SIDE_PX) {
    return { width, height };
  }

  const scale = MAX_PREVIEW_SIDE_PX / longestSide;

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

function compressImageToJpeg(image: HTMLImageElement): string {
  const scaledSize = getScaledSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");

  canvas.width = scaledSize.width;
  canvas.height = scaledSize.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Photo preview could not be created.");
  }

  context.drawImage(image, 0, 0, scaledSize.width, scaledSize.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function preparePhotoForTask(file: File): Promise<PreparedPhoto> {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const compressedPreview = compressImageToJpeg(image);

  return {
    previewUrl: compressedPreview,
    storedPreview: compressedPreview.length <= MAX_STORED_PREVIEW_LENGTH ? compressedPreview : null
  };
}

export { MAX_STORED_PREVIEW_LENGTH };
