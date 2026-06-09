import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class InvalidImageTypeError extends AppError {
  readonly code = ERROR_CODES.INVALID_IMAGE_TYPE;

  constructor(message = "Formato de imagen no soportado") {
    super(message, 400);
  }
}
