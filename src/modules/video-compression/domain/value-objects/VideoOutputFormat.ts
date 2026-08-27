export const VIDEO_OUTPUT_FORMATS = ["mp4", "webm"] as const;

export type VideoOutputFormat = (typeof VIDEO_OUTPUT_FORMATS)[number];

const MIME_BY_FORMAT: Record<VideoOutputFormat, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
};

export function isVideoOutputFormat(value: string): value is VideoOutputFormat {
  return (VIDEO_OUTPUT_FORMATS as readonly string[]).includes(value);
}

export function mimeTypeFromVideoOutputFormat(format: VideoOutputFormat): string {
  return MIME_BY_FORMAT[format];
}
