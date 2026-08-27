import type { Logger } from "@/shared/logger/logger";
import { logger } from "@/shared/logger/logger";
import { VideoDownloadNotFoundError } from "../../domain/errors/VideoDownloadNotFoundError";
import type { DownloadCompressedVideoOutput } from "../dtos/DownloadCompressedVideoOutput";
import type { CompressedVideoDownloadStorePort } from "../ports/CompressedVideoDownloadStorePort";
import type { TempFileStoragePort } from "../ports/TempFileStoragePort";

type ExecuteContext = {
  requestId?: string;
  requestLogger?: Logger;
};

export class DownloadCompressedVideoUseCase {
  constructor(
    private readonly downloadStore: CompressedVideoDownloadStorePort,
    private readonly tempStorage: TempFileStoragePort,
  ) {}

  async execute(id: string, context?: ExecuteContext): Promise<DownloadCompressedVideoOutput> {
    const log = context?.requestLogger ?? logger;

    const stored = await this.downloadStore.take(id);
    if (!stored) {
      throw new VideoDownloadNotFoundError();
    }

    try {
      const fileBuffer = await this.tempStorage.read(stored.filePath);

      log.debug("Compressed video download ready", {
        downloadId: id,
        filename: stored.filename,
        compressedSize: stored.compressedSize,
      });

      return {
        fileBuffer,
        filename: stored.filename,
        mimeType: stored.mimeType,
        outputFormat: stored.outputFormat,
        originalSize: stored.originalSize,
        compressedSize: stored.compressedSize,
        compressionRatio: stored.compressionRatio,
      };
    } finally {
      await this.tempStorage.delete(stored.filePath).catch(() => undefined);
    }
  }
}
