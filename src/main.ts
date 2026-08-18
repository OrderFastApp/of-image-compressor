import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CompressImageUseCase } from "./modules/image-compression/application/use-cases/CompressImageUseCase";
import { createImageCompressionModule } from "./modules/image-compression/composition/createImageCompressionModule";
import { ImageValidationService } from "./modules/image-compression/domain/services/ImageValidationService";
import { SharpImageCompressor } from "./modules/image-compression/infrastructure/compressors/SharpImageCompressor";
import { SharpImageMetadataReader } from "./modules/image-compression/infrastructure/metadata/SharpImageMetadataReader";
import { ImageCompressionController } from "./modules/image-compression/presentation/controllers/ImageCompressionController";
import { loadEnvConfig } from "./shared/config/env";
import { createCorsPlugin } from "./shared/http/cors";
import { errorHandler } from "./shared/http/errorHandler";
import { requestLoggingMiddleware } from "./shared/http/requestLoggingMiddleware";
import { logger } from "./shared/logger/logger";

export function createApp() {
  const envConfig = loadEnvConfig();

  logger.info("Creating application dependencies", {
    host: envConfig.HOST,
    port: envConfig.PORT,
    maxUploadSizeMb: envConfig.MAX_UPLOAD_SIZE_MB,
    maxImageWidth: envConfig.MAX_IMAGE_WIDTH,
    maxImageHeight: envConfig.MAX_IMAGE_HEIGHT,
    defaultQuality: envConfig.DEFAULT_QUALITY,
    defaultOutputFormat: envConfig.DEFAULT_OUTPUT_FORMAT,
    logLevel: envConfig.LOG_LEVEL,
    corsEnabled: envConfig.CORS_ENABLED,
    corsOrigin: envConfig.CORS_ORIGIN,
    corsCredentials: envConfig.CORS_CREDENTIALS,
  });

  const metadataReader = new SharpImageMetadataReader();
  const compressor = new SharpImageCompressor();
  const validationService = new ImageValidationService();
  const compressImageUseCase = new CompressImageUseCase(
    compressor,
    metadataReader,
    validationService,
    envConfig,
  );
  const controller = new ImageCompressionController(compressImageUseCase);

  const app = new Elysia()
    .use(createCorsPlugin(envConfig))
    .use(errorHandler)
    .use(requestLoggingMiddleware)
    .use(
      openapi({
        path: "/docs",
        specPath: "/docs/json",
        documentation: {
          info: {
            title: "OF Image Compressor API",
            version: "1.0.0",
            description:
              "HTTP API for image compression and optimization. Upload images via multipart/form-data and receive optimized binary responses.",
          },
          tags: [{ name: "Images", description: "Image compression endpoints" }],
        },
      }),
    )
    .use(createImageCompressionModule(controller))
    .get("/health", () => ({ status: "ok" }), {
      detail: {
        summary: "Health check",
        tags: ["System"],
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                  },
                },
              },
            },
          },
        },
      },
    })
    .listen({
      hostname: envConfig.HOST,
      port: envConfig.PORT,
    });

  logger.info("Application ready", {
    routes: ["GET /health", "POST /api/v1/images/compress", "GET /docs", "GET /docs/json"],
  });

  logger.info("Server started", {
    hostname: envConfig.HOST,
    port: envConfig.PORT,
    url: `http://localhost:${envConfig.PORT}`,
  });

  return app;
}

createApp();
