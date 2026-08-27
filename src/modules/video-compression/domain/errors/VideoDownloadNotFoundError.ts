import { AppError } from "@/shared/errors/AppError";
import { ERROR_CODES } from "@/shared/http/errorCodes";

export class VideoDownloadNotFoundError extends AppError {
  readonly code = ERROR_CODES.VIDEO_DOWNLOAD_NOT_FOUND;

  constructor(message = "Archivo de video comprimido no encontrado o expirado") {
    super(message, 404);
  }
}
