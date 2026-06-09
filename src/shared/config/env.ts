import { z } from "zod";

const outputFormatSchema = z.enum(["jpeg", "png", "webp", "avif"]);

function defaultHost(): string {
  return process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
}

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const envSchema = z.object({
  HOST: z.string().min(1).default(defaultHost),
  PORT: z.coerce.number().int().positive().default(3000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(20),
  MAX_IMAGE_WIDTH: z.coerce.number().int().positive().default(10000),
  MAX_IMAGE_HEIGHT: z.coerce.number().int().positive().default(10000),
  DEFAULT_QUALITY: z.coerce.number().int().min(1).max(100).default(80),
  DEFAULT_OUTPUT_FORMAT: outputFormatSchema.default("webp"),
  LOG_LEVEL: logLevelSchema.default("debug"),
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
