import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class InvalidVideoCompressionOptionsError extends AppError {
  readonly code = ERROR_CODES.INVALID_VIDEO_COMPRESSION_OPTIONS;

  constructor(message = "Opciones de compresión de video inválidas") {
    super(message, 400);
  }
}
