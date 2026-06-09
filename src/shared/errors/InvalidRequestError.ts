import { ERROR_CODES } from "../http/errorCodes";
import { AppError } from "./AppError";

export class InvalidRequestError extends AppError {
  readonly code = ERROR_CODES.INVALID_REQUEST;

  constructor(message: string) {
    super(message, 422);
  }
}
