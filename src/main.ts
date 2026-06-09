import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CompressImageUseCase } from "./modules/image-compression/application/use-cases/CompressImageUseCase";
import { createImageCompressionModule } from "./modules/image-compression/composition/createImageCompressionModule";
import { ImageValidationService } from "./modules/image-compression/domain/services/ImageValidationService";
import { SharpImageCompressor } from "./modules/image-compression/infrastructure/compressors/SharpImageCompressor";
import { SharpImageMetadataReader } from "./modules/image-compression/infrastructure/metadata/SharpImageMetadataReader";
import { ImageCompressionController } from "./modules/image-compression/presentation/controllers/ImageCompressionController";
import { loadEnvConfig } from "./shared/config/env";
import { errorHandler } from "./shared/http/errorHandler";
import { logger } from "./shared/logger/logger";

export function createApp() {
  const envConfig = loadEnvConfig();

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
    .use(errorHandler)
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

  logger.info("Server started", {
    hostname: envConfig.HOST,
    port: envConfig.PORT,
    url: `http://localhost:${envConfig.PORT}`,
  });

  return app;
}

createApp();
