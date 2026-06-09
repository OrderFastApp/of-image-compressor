import { Elysia } from "elysia";
import { ZodError } from "zod";
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
  ({ error, set, requestId }) => {
    const requestLogger = typeof requestId === "string" ? logger.child({ requestId }) : logger;

    if (error instanceof AppError) {
      const logContext = {
        code: error.code,
        statusCode: error.statusCode,
        errorMessage: error.message,
      };

      if (error.statusCode >= 500) {
        requestLogger.error("Application error", logContext);
      } else {
        requestLogger.warn("Application error", logContext);
      }

      set.status = error.statusCode;
      return buildErrorResponse(error.code, error.message);
    }

    if (error instanceof ZodError) {
      requestLogger.warn("Validation error", {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });

      set.status = 422;
      return buildErrorResponse(ERROR_CODES.INVALID_REQUEST, error.message);
    }

    if (error instanceof Error && error.name === "ZodError") {
      requestLogger.warn("Validation error", {
        message: error.message,
      });

      set.status = 422;
      return buildErrorResponse(ERROR_CODES.INVALID_REQUEST, error.message);
    }

    requestLogger.error("Unhandled error", {
      error: error instanceof Error ? error : String(error),
    });

    set.status = 500;
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred");
  },
);
