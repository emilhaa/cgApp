export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function createPhotoPreview(file: File): Promise<string> {
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
