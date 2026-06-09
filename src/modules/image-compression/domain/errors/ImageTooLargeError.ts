import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class ImageTooLargeError extends AppError {
  readonly code = ERROR_CODES.IMAGE_TOO_LARGE;

  constructor(message = "La imagen excede el tamaño máximo permitido o las dimensiones") {
    super(message, 413);
  }
}
