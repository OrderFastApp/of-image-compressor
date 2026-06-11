import type { CompressionOptions } from "../entities/CompressionOptions";
import type { ImageFile } from "../entities/ImageFile";
import { ImageTooLargeError } from "../errors/ImageTooLargeError";
import { InvalidCompressionOptionsError } from "../errors/InvalidCompressionOptionsError";
import { InvalidImageTypeError } from "../errors/InvalidImageTypeError";
import type { Dimensions } from "../value-objects/Dimensions";
import {
  extensionFromMimeType,
  isAllowedMimeType,
  mimeTypeFromExtension,
} from "../value-objects/ImageMimeType";
import { isOutputFormat } from "../value-objects/OutputFormat";

export type ValidationLimits = {
  maxUploadSizeBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
};

export class ImageValidationService {
  validateImageFile(image: ImageFile, limits: ValidationLimits): void {
    if (!isAllowedMimeType(image.mimeType)) {
      throw new InvalidImageTypeError("Unsupported image MIME type");
    }

    if (image.size.exceeds(limits.maxUploadSizeBytes)) {
      throw new ImageTooLargeError(
        `Image exceeds maximum upload size of ${limits.maxUploadSizeBytes} bytes`,
      );
    }

    const extension = this.extractExtension(image.filename);
    const mimeFromExtension = extension ? mimeTypeFromExtension(extension) : null;

    if (mimeFromExtension && mimeFromExtension !== image.mimeType) {
      throw new InvalidImageTypeError("File extension does not match MIME type");
    }

    if (extension) {
      const expectedExtension = extensionFromMimeType(image.mimeType);
      if (
        extension !== expectedExtension &&
        !(extension === "jpeg" && expectedExtension === "jpg")
      ) {
        const altMime = mimeTypeFromExtension(extension);
        if (altMime !== image.mimeType) {
          throw new InvalidImageTypeError("File extension does not match MIME type");
        }
      }
    }
  }

  validateCompressionOptions(options: CompressionOptions): void {
    if (!isOutputFormat(options.outputFormat)) {
      throw new InvalidCompressionOptionsError("Unsupported output format");
    }

    if (options.maxWidth !== undefined && options.maxWidth <= 0) {
      throw new InvalidCompressionOptionsError("maxWidth must be a positive integer");
    }

    if (options.maxHeight !== undefined && options.maxHeight <= 0) {
      throw new InvalidCompressionOptionsError("maxHeight must be a positive integer");
    }

    if (options.aspectRatio === undefined) {
      return;
    }

    if (options.aspectRatio.width <= 0 || options.aspectRatio.height <= 0) {
      throw new InvalidCompressionOptionsError("aspectRatio components must be positive integers");
    }
  }

  validateDimensions(dimensions: Dimensions, limits: ValidationLimits): void {
    if (dimensions.exceeds(limits.maxImageWidth, limits.maxImageHeight)) {
      throw new ImageTooLargeError(
        `Image dimensions exceed maximum allowed ${limits.maxImageWidth}x${limits.maxImageHeight}`,
      );
    }
  }

  private extractExtension(filename: string): string | null {
    const parts = filename.split(".");
    if (parts.length < 2) {
      return null;
    }
    return parts.at(-1)?.toLowerCase() ?? null;
  }
}
