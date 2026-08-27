import type {
  CompressedVideoDownloadStorePort,
  SaveCompressedVideoInput,
  StoredCompressedVideo,
} from "../../application/ports/CompressedVideoDownloadStorePort";
import type { TempFileStoragePort } from "../../application/ports/TempFileStoragePort";

export class InMemoryCompressedVideoDownloadStore implements CompressedVideoDownloadStorePort {
  private readonly entries = new Map<string, StoredCompressedVideo>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly tempStorage: TempFileStoragePort,
    cleanupIntervalMs = 60_000,
  ) {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpired();
    }, cleanupIntervalMs);
    if (typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  async save(input: SaveCompressedVideoInput): Promise<StoredCompressedVideo> {
    await this.cleanupExpired();

    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    const stored: StoredCompressedVideo = {
      id,
      filePath: input.filePath,
      filename: input.filename,
      mimeType: input.mimeType,
      outputFormat: input.outputFormat,
      originalSize: input.originalSize,
      compressedSize: input.compressedSize,
      compressionRatio: input.compressionRatio,
      expiresAt,
    };

    this.entries.set(id, stored);
    return stored;
  }

  async take(id: string): Promise<StoredCompressedVideo | null> {
    const stored = this.entries.get(id);
    if (!stored) {
      return null;
    }

    this.entries.delete(id);

    if (stored.expiresAt.getTime() <= Date.now()) {
      await this.tempStorage.delete(stored.filePath).catch(() => undefined);
      return null;
    }

    return stored;
  }

  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expired: StoredCompressedVideo[] = [];

    for (const entry of this.entries.values()) {
      if (entry.expiresAt.getTime() <= now) {
        expired.push(entry);
      }
    }

    for (const entry of expired) {
      this.entries.delete(entry.id);
      await this.tempStorage.delete(entry.filePath).catch(() => undefined);
    }
  }
}
