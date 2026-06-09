export const OUTPUT_FORMATS = ["jpeg", "png", "webp", "avif"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

const OUTPUT_FORMAT_MIME: Record<OutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value);
}

export function mimeTypeFromOutputFormat(format: OutputFormat): string {
  return OUTPUT_FORMAT_MIME[format];
}
