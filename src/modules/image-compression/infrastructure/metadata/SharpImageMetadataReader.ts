import sharp from "sharp";
import type {
  ImageMetadata,
  ImageMetadataReaderPort,
} from "../../application/ports/ImageMetadataReaderPort";
import { InvalidImageTypeError } from "../../domain/errors/InvalidImageTypeError";

export class SharpImageMetadataReader implements ImageMetadataReaderPort {
  async read(buffer: Uint8Array): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        format: metadata.format,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read image metadata";
      throw new InvalidImageTypeError(message);
    }
  }
}
