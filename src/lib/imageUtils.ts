export const maxImageDimension = 1600;
export const maxImageInputBytes = 12 * 1024 * 1024;
export const maxImageDataUrlLength = 2_500_000;

export type ProcessedImage = {
  dataUrl: string;
  height: number;
  width: number;
};

export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be imported.");
  }

  if (file.size > maxImageInputBytes) {
    throw new Error("That image is too large to import. Try a smaller file or screenshot.");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, maxImageDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    URL.revokeObjectURL(image.src);
    throw new Error("Could not process that image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(image.src);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > maxImageDataUrlLength) {
    throw new Error("That image is still too large after compression. Try a smaller crop.");
  }

  return { dataUrl, height, width };
}

export function getImageFilesFromClipboard(event: ClipboardEvent | { clipboardData: DataTransfer }) {
  const dataTransfer = event.clipboardData;
  if (!dataTransfer) {
    return [];
  }

  const files = Array.from(dataTransfer.files).filter((file) => file.type.startsWith("image/"));

  if (files.length) {
    return files;
  }

  return Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("Could not read that image."));
    };
    image.src = src;
  });
}
