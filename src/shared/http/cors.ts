import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import type { EnvConfig } from "../config/env";

const EXPOSE_HEADERS = [
  "X-Original-Size",
  "X-Compressed-Size",
  "X-Compression-Ratio",
  "X-Output-Format",
  "X-Request-Id",
];

export function parseCorsOrigins(value: string): "*" | string[] {
  const trimmed = value.trim();

  if (trimmed === "" || trimmed === "*") {
    return "*";
  }

  return trimmed
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function resolveOrigin(origins: "*" | string[], credentials: boolean) {
  if (origins === "*") {
    if (credentials) {
      return (request: Request) => Boolean(request.headers.get("origin"));
    }

    return true;
  }

  return origins;
}

export function createCorsPlugin(envConfig: EnvConfig) {
  if (!envConfig.CORS_ENABLED) {
    return new Elysia({ name: "cors-disabled" });
  }

  const origins = parseCorsOrigins(envConfig.CORS_ORIGIN);

  return cors({
    origin: resolveOrigin(origins, envConfig.CORS_CREDENTIALS),
    credentials: envConfig.CORS_CREDENTIALS,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: true,
    exposeHeaders: EXPOSE_HEADERS,
    preflight: true,
  });
}
