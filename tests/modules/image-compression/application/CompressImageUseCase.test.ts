import type { ImageCompressorPort } from "@/modules/image-compression/application/ports/ImageCompressorPort";
import type { ImageMetadataReaderPort } from "@/modules/image-compression/application/ports/ImageMetadataReaderPort";
import { CompressImageUseCase } from "@/modules/image-compression/application/use-cases/CompressImageUseCase";
import { CompressionFailedError } from "@/modules/image-compression/domain/errors/CompressionFailedError";
import { InvalidCompressionOptionsError } from "@/modules/image-compression/domain/errors/InvalidCompressionOptionsError";
import { InvalidImageTypeError } from "@/modules/image-compression/domain/errors/InvalidImageTypeError";
import { ImageValidationService } from "@/modules/image-compression/domain/services/ImageValidationService";
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
};

const validPngBuffer = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

function createUseCase(overrides?: {
  compressor?: Partial<ImageCompressorPort>;
  metadataReader?: Partial<ImageMetadataReaderPort>;
}) {
  const compressor: ImageCompressorPort = {
    compress: vi.fn().mockResolvedValue({
      buffer: new Uint8Array([1, 2, 3]),
      outputFormat: "webp",
    }),
    ...overrides?.compressor,
  };

  const metadataReader: ImageMetadataReaderPort = {
    read: vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      format: "png",
    }),
    ...overrides?.metadataReader,
  };

  return {
    useCase: new CompressImageUseCase(
      compressor,
      metadataReader,
      new ImageValidationService(),
      envConfig,
    ),
    compressor,
    metadataReader,
  };
}

describe("CompressImageUseCase", () => {
  it("comprime una imagen válida exitosamente", async () => {
    const { useCase } = createUseCase();

    const result = await useCase.execute({
      fileBuffer: validPngBuffer,
      originalFilename: "photo.png",
      mimeType: "image/png",
      quality: 80,
      outputFormat: "webp",
    });

    expect(result.compressedSize).toBe(3);
    expect(result.originalSize).toBe(validPngBuffer.length);
    expect(result.outputFormat).toBe("webp");
    expect(result.mimeType).toBe("image/webp");
    expect(result.filename).toBe("optimized-photo.webp");
    expect(result.compressionRatio).toBeGreaterThan(0);
  });

  it("rechaza una imagen inválida con buffer vacío", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute({
        fileBuffer: new Uint8Array(),
        originalFilename: "empty.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("Image buffer cannot be empty");
  });

  it("rechaza un formato no soportado", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute({
        fileBuffer: validPngBuffer,
        originalFilename: "doc.pdf",
        mimeType: "application/pdf",
      }),
    ).rejects.toBeInstanceOf(InvalidImageTypeError);
  });

  it("rechaza calidad inválida", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute({
        fileBuffer: validPngBuffer,
        originalFilename: "photo.png",
        mimeType: "image/png",
        quality: 150,
      }),
    ).rejects.toBeInstanceOf(InvalidCompressionOptionsError);
  });

  it("retorna métricas de compresión correctas", async () => {
    const compressed = new Uint8Array(50);
    const { useCase } = createUseCase({
      compressor: {
        compress: vi.fn().mockResolvedValue({
          buffer: compressed,
          outputFormat: "webp",
        }),
      },
    });

    const result = await useCase.execute({
      fileBuffer: validPngBuffer,
      originalFilename: "test.png",
      mimeType: "image/png",
    });

    expect(result.compressedSize).toBe(50);
    expect(result.originalSize).toBe(validPngBuffer.length);
    expect(result.compressionRatio).toBeTypeOf("number");
  });

  it("propaga error del compresor", async () => {
    const { useCase } = createUseCase({
      compressor: {
        compress: vi.fn().mockRejectedValue(new CompressionFailedError("Sharp failed")),
      },
    });

    await expect(
      useCase.execute({
        fileBuffer: validPngBuffer,
        originalFilename: "photo.png",
        mimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(CompressionFailedError);
  });
});
