import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class VideoTooLargeError extends AppError {
  readonly code = ERROR_CODES.VIDEO_TOO_LARGE;

  constructor(message = "El video excede el tamaño máximo permitido") {
    super(message, 413);
  }
}
