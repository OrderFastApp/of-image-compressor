export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
] as const;

export type ImageMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<ImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const EXTENSION_TO_MIME: Record<string, ImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export function isAllowedMimeType(mimeType: string): mimeType is ImageMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function mimeTypeFromExtension(extension: string): ImageMimeType | null {
  const normalized = extension.toLowerCase().replace(/^\./, "");
  return EXTENSION_TO_MIME[normalized] ?? null;
}

export function extensionFromMimeType(mimeType: ImageMimeType): string {
  return MIME_TO_EXTENSION[mimeType];
}
