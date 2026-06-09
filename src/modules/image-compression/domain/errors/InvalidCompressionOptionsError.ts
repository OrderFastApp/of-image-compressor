import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class InvalidCompressionOptionsError extends AppError {
  readonly code = ERROR_CODES.INVALID_COMPRESSION_OPTIONS;

  constructor(message = "Opciones de compresión inválidas") {
    super(message, 400);
  }
}
