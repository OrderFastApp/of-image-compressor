import type { EnvConfig } from "@/shared/config/env";
import { logger } from "@/shared/logger/logger";
import { VideoCompressionOptions } from "../../domain/entities/VideoCompressionOptions";
import { VideoCompressionResult } from "../../domain/entities/VideoCompressionResult";
import { VideoFile } from "../../domain/entities/VideoFile";
import { InvalidVideoCompressionOptionsError } from "../../domain/errors/InvalidVideoCompressionOptionsError";
import { InvalidVideoTypeError } from "../../domain/errors/InvalidVideoTypeError";
import type {
  VideoValidationLimits,
  VideoValidationService,
} from "../../domain/services/VideoValidationService";
import { Duration } from "../../domain/value-objects/Duration";
import { VideoCrf } from "../../domain/value-objects/VideoCrf";
import {
  type VideoMimeType,
  isAllowedVideoMimeType,
} from "../../domain/value-objects/VideoMimeType";
import type { VideoOutputFormat } from "../../domain/value-objects/VideoOutputFormat";
import type { CompressVideoInput } from "../dtos/CompressVideoInput";
import type { CompressVideoCompleteEvent } from "../dtos/CompressVideoStreamEvent";
import type { CompressedVideoDownloadStorePort } from "../ports/CompressedVideoDownloadStorePort";
import type { TempFileStoragePort } from "../ports/TempFileStoragePort";
import type { VideoCompressorPort } from "../ports/VideoCompressorPort";
import type { VideoMetadataReaderPort } from "../ports/VideoMetadataReaderPort";

type ExecuteContext = {
  requestId?: string;
};

export type CompressVideoProgressCallback = (percent: number) => void;

export class CompressVideoUseCase {
  constructor(
    private readonly compressor: VideoCompressorPort,
    private readonly metadataReader: VideoMetadataReaderPort,
    private readonly tempStorage: TempFileStoragePort,
    private readonly downloadStore: CompressedVideoDownloadStorePort,
    private readonly validationService: VideoValidationService,
    private readonly envConfig: EnvConfig,
  ) {}

  async execute(
    input: CompressVideoInput,
    onProgress: CompressVideoProgressCallback,
    context?: ExecuteContext,
  ): Promise<CompressVideoCompleteEvent> {
    const log = context?.requestId ? logger.child({ requestId: context.requestId }) : logger;
    let inputPath: string | undefined;

    log.debug("CompressVideoUseCase started", {
      filename: input.originalFilename,
      mimeType: input.mimeType,
      bufferLength: input.fileBuffer.byteLength,
      quality: input.quality,
      outputFormat: input.outputFormat,
      maxWidth: input.maxWidth,
      maxHeight: input.maxHeight,
    });

    if (!isAllowedVideoMimeType(input.mimeType)) {
      throw new InvalidVideoTypeError("Formato de video no soportado");
    }

    const mimeType: VideoMimeType = input.mimeType;
    const video = new VideoFile(input.fileBuffer, input.originalFilename, mimeType);

    const limits: VideoValidationLimits = {
      maxUploadSizeBytes: this.envConfig.MAX_VIDEO_UPLOAD_SIZE_MB * 1024 * 1024,
      maxDurationSeconds: this.envConfig.MAX_VIDEO_DURATION_SECONDS,
    };

    this.validationService.validateVideoFile(video, limits);

    const crf = this.resolveCrf(input.quality);
    const outputFormat: VideoOutputFormat =
      input.outputFormat ?? this.envConfig.DEFAULT_VIDEO_OUTPUT_FORMAT;

    const options = new VideoCompressionOptions(crf, outputFormat, input.maxWidth, input.maxHeight);
    this.validationService.validateCompressionOptions(options);

    const written = await this.tempStorage.write({
      buffer: video.buffer,
      filename: video.filename,
    });
    inputPath = written.path;

    try {
      const metadata = await this.metadataReader.read(inputPath);
      if (!Number.isFinite(metadata.durationSeconds) || metadata.durationSeconds <= 0) {
        throw new InvalidVideoTypeError("Unable to read video duration");
      }

      const duration = new Duration(metadata.durationSeconds);
      this.validationService.validateDuration(duration, limits);

      log.debug("Video metadata read", {
        durationSeconds: metadata.durationSeconds,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      });

      const outputFilename = this.buildOutputFilename(input.originalFilename, outputFormat);
      const outputPath = await this.tempStorage.createOutputPath(outputFilename);

      const compressionStartedAt = Date.now();
      const { compressedSize } = await this.compressor.compress({
        inputPath,
        outputPath,
        options,
        durationSeconds: metadata.durationSeconds,
        onProgress,
      });
      const compressionDurationMs = Date.now() - compressionStartedAt;

      const result = new VideoCompressionResult({
        filePath: outputPath,
        filename: outputFilename,
        outputFormat,
        originalSize: video.size.bytes,
        compressedSize,
      });

      log.debug("Video compression finished", {
        inputSizeBytes: video.size.bytes,
        outputSizeBytes: result.compressedSize,
        compressionRatio: result.compressionRatio,
        durationMs: compressionDurationMs,
      });

      const stored = await this.downloadStore.save({
        filePath: result.filePath,
        filename: result.filename,
        mimeType: result.mimeType,
        outputFormat: result.outputFormat,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        ttlSeconds: this.envConfig.VIDEO_DOWNLOAD_TTL_SECONDS,
      });

      return {
        type: "complete",
        downloadId: stored.id,
        downloadUrl: `/api/v1/videos/download/${stored.id}`,
        filename: result.filename,
        mimeType: result.mimeType,
        outputFormat: result.outputFormat,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        expiresAt: stored.expiresAt.toISOString(),
      };
    } finally {
      if (inputPath) {
        await this.tempStorage.delete(inputPath).catch(() => undefined);
      }
    }
  }

  private resolveCrf(quality: number | undefined) {
    if (quality === undefined) {
      const crf = VideoCrf.tryCreate(this.envConfig.DEFAULT_VIDEO_CRF);
      if (!crf) {
        throw new InvalidVideoCompressionOptionsError(
          "DEFAULT_VIDEO_CRF must be an integer between 0 and 51",
        );
      }
      return crf;
    }

    const crf = VideoCrf.tryFromQuality(quality);
    if (!crf) {
      throw new InvalidVideoCompressionOptionsError("Quality must be an integer between 1 and 100");
    }
    return crf;
  }

  private buildOutputFilename(originalFilename: string, outputFormat: VideoOutputFormat): string {
    const baseName = originalFilename.replace(/\.[^.]+$/, "") || "video";
    const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `optimized-${sanitized}.${outputFormat}`;
  }
}
