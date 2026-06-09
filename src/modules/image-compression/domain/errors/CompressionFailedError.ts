import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class CompressionFailedError extends AppError {
  readonly code = ERROR_CODES.COMPRESSION_FAILED;

  constructor(message = "Error al comprimir la imagen") {
    super(message, 500);
  }
}
