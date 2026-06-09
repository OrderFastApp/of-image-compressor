import { logger } from "@/shared/logger/logger";
import sharp from "sharp";
import type {
  ImageMetadata,
  ImageMetadataReaderPort,
} from "../../application/ports/ImageMetadataReaderPort";
import { InvalidImageTypeError } from "../../domain/errors/InvalidImageTypeError";

export class SharpImageMetadataReader implements ImageMetadataReaderPort {
  async read(buffer: Uint8Array): Promise<ImageMetadata> {
    const startedAt = Date.now();

    logger.debug("SharpImageMetadataReader started", {
      bufferLength: buffer.byteLength,
    });

    try {
      const metadata = await sharp(buffer).metadata();
      const durationMs = Date.now() - startedAt;

      logger.debug("SharpImageMetadataReader completed", {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        durationMs,
      });

      return {
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        format: metadata.format,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read image metadata";

      logger.debug("SharpImageMetadataReader failed", {
        error: error instanceof Error ? error : String(error),
        durationMs: Date.now() - startedAt,
      });

      throw new InvalidImageTypeError(message);
    }
  }
}
