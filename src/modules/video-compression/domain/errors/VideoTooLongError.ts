import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class VideoTooLongError extends AppError {
  readonly code = ERROR_CODES.VIDEO_TOO_LONG;

  constructor(message = "El video excede la duración máxima permitida") {
    super(message, 413);
  }
}
