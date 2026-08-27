import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class VideoCompressionFailedError extends AppError {
  readonly code = ERROR_CODES.VIDEO_COMPRESSION_FAILED;

  constructor(message = "Error al comprimir el video") {
    super(message, 500);
  }
}
