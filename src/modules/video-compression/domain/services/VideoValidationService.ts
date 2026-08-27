import type { VideoCompressionOptions } from "../entities/VideoCompressionOptions";
import type { VideoFile } from "../entities/VideoFile";
import { InvalidVideoCompressionOptionsError } from "../errors/InvalidVideoCompressionOptionsError";
import { InvalidVideoTypeError } from "../errors/InvalidVideoTypeError";
import { VideoTooLargeError } from "../errors/VideoTooLargeError";
import { VideoTooLongError } from "../errors/VideoTooLongError";
import type { Duration } from "../value-objects/Duration";
import {
  extensionFromVideoMimeType,
  isAllowedVideoMimeType,
  videoMimeTypeFromExtension,
} from "../value-objects/VideoMimeType";
import { isVideoOutputFormat } from "../value-objects/VideoOutputFormat";

export type VideoValidationLimits = {
  maxUploadSizeBytes: number;
  maxDurationSeconds: number;
};

export class VideoValidationService {
  validateVideoFile(video: VideoFile, limits: VideoValidationLimits): void {
    if (!isAllowedVideoMimeType(video.mimeType)) {
      throw new InvalidVideoTypeError("Unsupported video MIME type");
    }

    if (video.size.exceeds(limits.maxUploadSizeBytes)) {
      throw new VideoTooLargeError(
        `Video exceeds maximum upload size of ${limits.maxUploadSizeBytes} bytes`,
      );
    }

    const extension = this.extractExtension(video.filename);
    const mimeFromExtension = extension ? videoMimeTypeFromExtension(extension) : null;

    if (mimeFromExtension && mimeFromExtension !== video.mimeType) {
      throw new InvalidVideoTypeError("File extension does not match MIME type");
    }

    if (extension) {
      const expectedExtension = extensionFromVideoMimeType(video.mimeType);
      if (extension !== expectedExtension) {
        const altMime = videoMimeTypeFromExtension(extension);
        if (altMime !== video.mimeType) {
          throw new InvalidVideoTypeError("File extension does not match MIME type");
        }
      }
    }
  }

  validateCompressionOptions(options: VideoCompressionOptions): void {
    if (!isVideoOutputFormat(options.outputFormat)) {
      throw new InvalidVideoCompressionOptionsError("Unsupported output format");
    }

    if (options.maxWidth !== undefined && options.maxWidth <= 0) {
      throw new InvalidVideoCompressionOptionsError("maxWidth must be a positive integer");
    }

    if (options.maxHeight !== undefined && options.maxHeight <= 0) {
      throw new InvalidVideoCompressionOptionsError("maxHeight must be a positive integer");
    }
  }

  validateDuration(duration: Duration, limits: VideoValidationLimits): void {
    if (duration.exceeds(limits.maxDurationSeconds)) {
      throw new VideoTooLongError(
        `Video duration exceeds maximum allowed ${limits.maxDurationSeconds} seconds`,
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
