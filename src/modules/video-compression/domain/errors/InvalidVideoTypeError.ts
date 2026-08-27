import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class InvalidVideoTypeError extends AppError {
  readonly code = ERROR_CODES.INVALID_VIDEO_TYPE;

  constructor(message = "Formato de video no soportado") {
    super(message, 400);
  }
}
