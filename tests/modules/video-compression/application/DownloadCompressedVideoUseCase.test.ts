import type { CompressedVideoDownloadStorePort } from "@/modules/video-compression/application/ports/CompressedVideoDownloadStorePort";
import type { TempFileStoragePort } from "@/modules/video-compression/application/ports/TempFileStoragePort";
import { DownloadCompressedVideoUseCase } from "@/modules/video-compression/application/use-cases/DownloadCompressedVideoUseCase";
import { VideoDownloadNotFoundError } from "@/modules/video-compression/domain/errors/VideoDownloadNotFoundError";
import { describe, expect, it, vi } from "vitest";

function createUseCase(overrides?: {
  downloadStore?: Partial<CompressedVideoDownloadStorePort>;
  tempStorage?: Partial<TempFileStoragePort>;
}) {
  const downloadStore: CompressedVideoDownloadStorePort = {
    save: vi.fn(),
    get: vi.fn().mockResolvedValue({
      id: "id-1",
      filePath: "/tmp/out.mp4",
      filename: "optimized-clip.mp4",
      mimeType: "video/mp4",
      outputFormat: "mp4",
      originalSize: 100,
      compressedSize: 40,
      compressionRatio: 60,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    }),
    ...overrides?.downloadStore,
  };

  const tempStorage: TempFileStoragePort = {
    write: vi.fn(),
    createOutputPath: vi.fn(),
    read: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
    size: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides?.tempStorage,
  };

  return {
    useCase: new DownloadCompressedVideoUseCase(downloadStore, tempStorage),
    downloadStore,
    tempStorage,
  };
}

describe("DownloadCompressedVideoUseCase", () => {
  it("devuelve el video sin borrar el archivo (reutilizable hasta TTL)", async () => {
    const { useCase, tempStorage, downloadStore } = createUseCase();

    const result = await useCase.execute("id-1");

    expect(result.filename).toBe("optimized-clip.mp4");
    expect(result.fileBuffer).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(result.compressedSize).toBe(40);
    expect(downloadStore.get).toHaveBeenCalledWith("id-1");
    expect(tempStorage.delete).not.toHaveBeenCalled();
  });

  it("falla si el id no existe", async () => {
    const { useCase } = createUseCase({
      downloadStore: {
        get: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(useCase.execute("missing")).rejects.toBeInstanceOf(VideoDownloadNotFoundError);
  });
});
