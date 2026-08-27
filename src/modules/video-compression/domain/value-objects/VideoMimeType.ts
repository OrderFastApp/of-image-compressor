export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
] as const;

export type VideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<VideoMimeType, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
};

const EXTENSION_TO_MIME: Record<string, VideoMimeType> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

export function isAllowedVideoMimeType(mimeType: string): mimeType is VideoMimeType {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function videoMimeTypeFromExtension(extension: string): VideoMimeType | null {
  const normalized = extension.toLowerCase().replace(/^\./, "");
  return EXTENSION_TO_MIME[normalized] ?? null;
}

export function extensionFromVideoMimeType(mimeType: VideoMimeType): string {
  return MIME_TO_EXTENSION[mimeType];
}
