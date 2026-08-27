import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const outputFormatSchema = z.enum(["jpeg", "png", "webp", "avif"]);
const videoOutputFormatSchema = z.enum(["mp4", "webm"]);

function defaultHost(): string {
  return process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
}

function defaultVideoTempDir(): string {
  return join(tmpdir(), "of-video-compressor");
}

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

function booleanFromEnv(defaultValue: boolean) {
  return z.preprocess((value) => {
    if (value === undefined || value === "") {
      return defaultValue;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }

    return defaultValue;
  }, z.boolean());
}

const envSchema = z.object({
  HOST: z.string().min(1).default(defaultHost),
  PORT: z.coerce.number().int().positive().default(3000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(20),
  MAX_IMAGE_WIDTH: z.coerce.number().int().positive().default(10000),
  MAX_IMAGE_HEIGHT: z.coerce.number().int().positive().default(10000),
  DEFAULT_QUALITY: z.coerce.number().int().min(1).max(100).default(80),
  DEFAULT_OUTPUT_FORMAT: outputFormatSchema.default("webp"),
  MAX_VIDEO_UPLOAD_SIZE_MB: z.coerce.number().positive().default(200),
  MAX_VIDEO_DURATION_SECONDS: z.coerce.number().int().positive().default(600),
  DEFAULT_VIDEO_CRF: z.coerce.number().int().min(0).max(51).default(28),
  DEFAULT_VIDEO_OUTPUT_FORMAT: videoOutputFormatSchema.default("mp4"),
  FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
  FFPROBE_PATH: z.string().min(1).default("ffprobe"),
  VIDEO_TEMP_DIR: z.string().min(1).default(defaultVideoTempDir),
  VIDEO_DOWNLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: logLevelSchema.default("debug"),
  CORS_ENABLED: booleanFromEnv(true),
  CORS_ORIGIN: z.string().min(1).default("*"),
  CORS_CREDENTIALS: booleanFromEnv(false),
});

export type EnvConfig = z.infer<typeof envSchema>;
export type OutputFormat = z.infer<typeof outputFormatSchema>;

export function loadEnvConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message).join(", ");
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return result.data;
}

export function getMaxUploadSizeBytes(config: EnvConfig): number {
  return config.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
}

export function getMaxVideoUploadSizeBytes(config: EnvConfig): number {
  return config.MAX_VIDEO_UPLOAD_SIZE_MB * 1024 * 1024;
}
