import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CompressImageUseCase } from "./modules/image-compression/application/use-cases/CompressImageUseCase";
import { createImageCompressionModule } from "./modules/image-compression/composition/createImageCompressionModule";
import { ImageValidationService } from "./modules/image-compression/domain/services/ImageValidationService";
import { SharpImageCompressor } from "./modules/image-compression/infrastructure/compressors/SharpImageCompressor";
import { SharpImageMetadataReader } from "./modules/image-compression/infrastructure/metadata/SharpImageMetadataReader";
import { ImageCompressionController } from "./modules/image-compression/presentation/controllers/ImageCompressionController";
import { CompressVideoUseCase } from "./modules/video-compression/application/use-cases/CompressVideoUseCase";
import { DownloadCompressedVideoUseCase } from "./modules/video-compression/application/use-cases/DownloadCompressedVideoUseCase";
import { createVideoCompressionModule } from "./modules/video-compression/composition/createVideoCompressionModule";
import { VideoValidationService } from "./modules/video-compression/domain/services/VideoValidationService";
import { FfmpegVideoCompressor } from "./modules/video-compression/infrastructure/compressors/FfmpegVideoCompressor";
import { InMemoryCompressedVideoDownloadStore } from "./modules/video-compression/infrastructure/download/InMemoryCompressedVideoDownloadStore";
import { FfprobeVideoMetadataReader } from "./modules/video-compression/infrastructure/metadata/FfprobeVideoMetadataReader";
import { BunTempFileStorage } from "./modules/video-compression/infrastructure/temp/BunTempFileStorage";
import { VideoCompressionController } from "./modules/video-compression/presentation/controllers/VideoCompressionController";
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
    maxVideoUploadSizeMb: envConfig.MAX_VIDEO_UPLOAD_SIZE_MB,
    maxVideoDurationSeconds: envConfig.MAX_VIDEO_DURATION_SECONDS,
    defaultVideoCrf: envConfig.DEFAULT_VIDEO_CRF,
    defaultVideoOutputFormat: envConfig.DEFAULT_VIDEO_OUTPUT_FORMAT,
    ffmpegPath: envConfig.FFMPEG_PATH,
    ffprobePath: envConfig.FFPROBE_PATH,
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
  const imageController = new ImageCompressionController(compressImageUseCase);

  const videoTempStorage = new BunTempFileStorage(envConfig.VIDEO_TEMP_DIR);
  const videoDownloadStore = new InMemoryCompressedVideoDownloadStore(videoTempStorage);
  const videoMetadataReader = new FfprobeVideoMetadataReader(envConfig.FFPROBE_PATH);
  const videoCompressor = new FfmpegVideoCompressor(
    envConfig.FFMPEG_PATH,
    videoTempStorage,
    envConfig.FFMPEG_THREADS,
  );
  const videoValidationService = new VideoValidationService();
  const compressVideoUseCase = new CompressVideoUseCase(
    videoCompressor,
    videoMetadataReader,
    videoTempStorage,
    videoDownloadStore,
    videoValidationService,
    envConfig,
  );
  const downloadCompressedVideoUseCase = new DownloadCompressedVideoUseCase(
    videoDownloadStore,
    videoTempStorage,
  );
  const videoController = new VideoCompressionController(
    compressVideoUseCase,
    downloadCompressedVideoUseCase,
  );

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
              "HTTP API for image and video compression. Upload media via multipart/form-data; images return optimized binaries, videos stream SSE progress and a temporary download URL.",
          },
          tags: [
            { name: "Images", description: "Image compression endpoints" },
            { name: "Videos", description: "Video compression endpoints" },
            { name: "System", description: "Health and system endpoints" },
          ],
        },
      }),
    )
    .use(createImageCompressionModule(imageController))
    .use(createVideoCompressionModule(videoController))
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
    routes: [
      "GET /health",
      "POST /api/v1/images/compress",
      "POST /api/v1/videos/compress",
      "GET /api/v1/videos/download/:id",
      "GET /docs",
      "GET /docs/json",
    ],
  });

  logger.info("Server started", {
    hostname: envConfig.HOST,
    port: envConfig.PORT,
    url: `http://localhost:${envConfig.PORT}`,
  });

  return app;
}

createApp();
