import { Elysia } from "elysia";
import { AppError } from "../errors/AppError";
import { logger } from "../logger/logger";
import { ERROR_CODES } from "./errorCodes";

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

function buildErrorResponse(code: string, message: string): ErrorResponse {
  return {
    success: false,
    error: { code, message },
  };
}

export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return buildErrorResponse(error.code, error.message);
    }

    if (error instanceof Error && error.name === "ZodError") {
      set.status = 422;
      return buildErrorResponse(ERROR_CODES.INVALID_REQUEST, error.message);
    }

    logger.error("Unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    });

    set.status = 500;
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred");
  },
);
