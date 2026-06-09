import { logger } from "@/shared/logger/logger";
import sharp from "sharp";
import type { ImageCompressorPort } from "../../application/ports/ImageCompressorPort";
import { CompressionFailedError } from "../../domain/errors/CompressionFailedError";
import type { OutputFormat } from "../../domain/value-objects/OutputFormat";

export class SharpImageCompressor implements ImageCompressorPort {
  async compress(request: Parameters<ImageCompressorPort["compress"]>[0]) {
    const { image, options } = request;
    const startedAt = Date.now();

    logger.debug("SharpImageCompressor started", {
      mimeType: image.mimeType,
      inputSizeBytes: image.buffer.byteLength,
      outputFormat: options.outputFormat,
      quality: options.quality.value,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
    });

    try {
      let pipeline = sharp(image.buffer, { animated: image.mimeType === "image/gif" });

      if (options.maxWidth !== undefined || options.maxHeight !== undefined) {
        pipeline = pipeline.resize({
          width: options.maxWidth,
          height: options.maxHeight,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      const quality = options.quality.value;
      const outputFormat = options.outputFormat;

      let buffer: Buffer;

      switch (outputFormat) {
        case "jpeg":
          buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
          break;
        case "png":
          buffer = await pipeline
            .png({ compressionLevel: Math.round((100 - quality) / 10) })
            .toBuffer();
          break;
        case "webp":
          buffer = await pipeline.webp({ quality }).toBuffer();
          break;
        case "avif":
          buffer = await pipeline.avif({ quality }).toBuffer();
          break;
        default:
          throw new CompressionFailedError(
            `Unsupported output format: ${outputFormat satisfies never}`,
          );
      }

      const durationMs = Date.now() - startedAt;

      logger.debug("SharpImageCompressor completed", {
        outputFormat,
        inputSizeBytes: image.buffer.byteLength,
        outputSizeBytes: buffer.byteLength,
        durationMs,
      });

      return {
        buffer: new Uint8Array(buffer),
        outputFormat: outputFormat as OutputFormat,
      };
    } catch (error) {
      if (error instanceof CompressionFailedError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown compression error";

      logger.debug("SharpImageCompressor failed", {
        error: error instanceof Error ? error : String(error),
        durationMs: Date.now() - startedAt,
      });

      throw new CompressionFailedError(message);
    }
  }
}
