import type { CompressedVideoDownloadStorePort } from "@/modules/video-compression/application/ports/CompressedVideoDownloadStorePort";
import type { TempFileStoragePort } from "@/modules/video-compression/application/ports/TempFileStoragePort";
import type { VideoCompressorPort } from "@/modules/video-compression/application/ports/VideoCompressorPort";
import type { VideoMetadataReaderPort } from "@/modules/video-compression/application/ports/VideoMetadataReaderPort";
import { CompressVideoUseCase } from "@/modules/video-compression/application/use-cases/CompressVideoUseCase";
import { InvalidVideoCompressionOptionsError } from "@/modules/video-compression/domain/errors/InvalidVideoCompressionOptionsError";
import { InvalidVideoTypeError } from "@/modules/video-compression/domain/errors/InvalidVideoTypeError";
import { VideoCompressionFailedError } from "@/modules/video-compression/domain/errors/VideoCompressionFailedError";
import { VideoTooLongError } from "@/modules/video-compression/domain/errors/VideoTooLongError";
import { VideoValidationService } from "@/modules/video-compression/domain/services/VideoValidationService";
import type { EnvConfig } from "@/shared/config/env";
import { describe, expect, it, vi } from "vitest";

const envConfig: EnvConfig = {
  HOST: "localhost",
  PORT: 3000,
  MAX_UPLOAD_SIZE_MB: 20,
  MAX_IMAGE_WIDTH: 10000,
  MAX_IMAGE_HEIGHT: 10000,
  DEFAULT_QUALITY: 80,
  DEFAULT_OUTPUT_FORMAT: "webp",
  MAX_VIDEO_UPLOAD_SIZE_MB: 200,
  MAX_VIDEO_DURATION_SECONDS: 600,
  DEFAULT_VIDEO_CRF: 28,
  DEFAULT_VIDEO_OUTPUT_FORMAT: "mp4",
  FFMPEG_PATH: "ffmpeg",
  FFPROBE_PATH: "ffprobe",
  FFMPEG_THREADS: 2,
  VIDEO_TEMP_DIR: "/tmp/of-video-compressor",
  VIDEO_DOWNLOAD_TTL_SECONDS: 300,
  LOG_LEVEL: "debug",
  CORS_ENABLED: true,
  CORS_ORIGIN: "*",
  CORS_CREDENTIALS: false,
};

const validBuffer = new Uint8Array([1, 2, 3, 4, 5]);

function createUseCase(overrides?: {
  compressor?: Partial<VideoCompressorPort>;
  metadataReader?: Partial<VideoMetadataReaderPort>;
  tempStorage?: Partial<TempFileStoragePort>;
  downloadStore?: Partial<CompressedVideoDownloadStorePort>;
}) {
  const compressor: VideoCompressorPort = {
    compress: vi.fn().mockImplementation(async ({ onProgress }) => {
      onProgress(25);
      onProgress(75);
      onProgress(100);
      return {
        outputPath: "/tmp/out.mp4",
        outputFormat: "mp4",
        compressedSize: 2,
      };
    }),
    ...overrides?.compressor,
  };

  const metadataReader: VideoMetadataReaderPort = {
    read: vi.fn().mockResolvedValue({
      durationSeconds: 10,
      width: 1280,
      height: 720,
      format: "mp4",
    }),
    ...overrides?.metadataReader,
  };

  const tempStorage: TempFileStoragePort = {
    write: vi.fn().mockResolvedValue({
      path: "/tmp/in.mp4",
      filename: "in.mp4",
      size: validBuffer.length,
    }),
    createOutputPath: vi.fn().mockResolvedValue("/tmp/out.mp4"),
    read: vi.fn().mockResolvedValue(new Uint8Array([9, 9])),
    size: vi.fn().mockResolvedValue(2),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides?.tempStorage,
  };

  const downloadStore: CompressedVideoDownloadStorePort = {
    save: vi.fn().mockResolvedValue({
      id: "download-id-1",
      filePath: "/tmp/out.mp4",
      filename: "optimized-clip.mp4",
      mimeType: "video/mp4",
      outputFormat: "mp4",
      originalSize: validBuffer.length,
      compressedSize: 2,
      compressionRatio: 60,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    }),
    take: vi.fn(),
    ...overrides?.downloadStore,
  };

  return {
    useCase: new CompressVideoUseCase(
      compressor,
      metadataReader,
      tempStorage,
      downloadStore,
      new VideoValidationService(),
      envConfig,
    ),
    compressor,
    metadataReader,
    tempStorage,
    downloadStore,
  };
}

describe("CompressVideoUseCase", () => {
  it("comprime un video válido, reporta progreso y guarda download", async () => {
    const { useCase, compressor, downloadStore, tempStorage } = createUseCase();
    const progress: number[] = [];

    const result = await useCase.execute(
      {
        fileBuffer: validBuffer,
        originalFilename: "clip.mp4",
        mimeType: "video/mp4",
        quality: 80,
        outputFormat: "mp4",
      },
      (percent) => {
        progress.push(percent);
      },
    );

    expect(progress).toEqual([25, 75, 100]);
    expect(result.type).toBe("complete");
    expect(result.downloadUrl).toBe("/api/v1/videos/download/download-id-1");
    expect(result.filename).toBe("optimized-clip.mp4");
    expect(result.compressedSize).toBe(2);
    expect(compressor.compress).toHaveBeenCalledOnce();
    expect(downloadStore.save).toHaveBeenCalledOnce();
    expect(tempStorage.delete).toHaveBeenCalledWith("/tmp/in.mp4");
  });

  it("rechaza un buffer vacío", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute(
        {
          fileBuffer: new Uint8Array(),
          originalFilename: "empty.mp4",
          mimeType: "video/mp4",
        },
        () => undefined,
      ),
    ).rejects.toThrow("Video buffer cannot be empty");
  });

  it("rechaza un formato no soportado", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute(
        {
          fileBuffer: validBuffer,
          originalFilename: "doc.pdf",
          mimeType: "application/pdf",
        },
        () => undefined,
      ),
    ).rejects.toBeInstanceOf(InvalidVideoTypeError);
  });

  it("rechaza quality fuera de rango", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute(
        {
          fileBuffer: validBuffer,
          originalFilename: "clip.mp4",
          mimeType: "video/mp4",
          quality: 0,
        },
        () => undefined,
      ),
    ).rejects.toBeInstanceOf(InvalidVideoCompressionOptionsError);
  });

  it("rechaza duración excesiva", async () => {
    const { useCase } = createUseCase({
      metadataReader: {
        read: vi.fn().mockResolvedValue({
          durationSeconds: 9999,
          width: 1280,
          height: 720,
        }),
      },
    });

    await expect(
      useCase.execute(
        {
          fileBuffer: validBuffer,
          originalFilename: "clip.mp4",
          mimeType: "video/mp4",
        },
        () => undefined,
      ),
    ).rejects.toBeInstanceOf(VideoTooLongError);
  });

  it("propaga error del compresor", async () => {
    const { useCase } = createUseCase({
      compressor: {
        compress: vi.fn().mockRejectedValue(new VideoCompressionFailedError("boom")),
      },
    });

    await expect(
      useCase.execute(
        {
          fileBuffer: validBuffer,
          originalFilename: "clip.mp4",
          mimeType: "video/mp4",
        },
        () => undefined,
      ),
    ).rejects.toBeInstanceOf(VideoCompressionFailedError);
  });
});
