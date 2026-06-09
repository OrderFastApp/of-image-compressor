import { randomUUID } from "node:crypto";
import { Elysia } from "elysia";
import { logger } from "../logger/logger";

function getRequestPath(request: Request): string {
  return new URL(request.url).pathname;
}

function getRequestQuery(request: Request): string | undefined {
  const query = new URL(request.url).search;
  return query.length > 0 ? query : undefined;
}

function getResponseStatus(response: unknown, set: { status?: number | string }): number {
  if (response instanceof Response) {
    return response.status;
  }
  return typeof set.status === "number" ? set.status : 200;
}

function getResponseContentType(
  response: unknown,
  set: { headers?: Record<string, unknown> },
): string | undefined {
  if (response instanceof Response) {
    return response.headers.get("content-type") ?? undefined;
  }

  const headers = set.headers ?? {};
  const contentType = headers["Content-Type"] ?? headers["content-type"];
  return typeof contentType === "string" ? contentType : undefined;
}

export const requestLoggingMiddleware = new Elysia({ name: "request-logging" })
  .derive({ as: "global" }, ({ request }) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const requestStartedAt = Date.now();

    return {
      requestId,
      requestStartedAt,
      requestLogger: logger.child({ requestId }),
    };
  })
  .onBeforeHandle({ as: "global" }, ({ request, requestLogger }) => {
    requestLogger.info("Incoming request", {
      method: request.method,
      path: getRequestPath(request),
      query: getRequestQuery(request),
      contentType: request.headers.get("content-type") ?? undefined,
      contentLength: request.headers.get("content-length") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
  })
  .onAfterHandle(
    { as: "global" },
    ({ request, set, response, requestStartedAt, requestLogger, requestId }) => {
      const durationMs = Date.now() - requestStartedAt;

      requestLogger.info("Request completed", {
        method: request.method,
        path: getRequestPath(request),
        status: getResponseStatus(response, set),
        durationMs,
        responseContentType: getResponseContentType(response, set),
      });

      set.headers = {
        ...(set.headers ?? {}),
        "X-Request-Id": requestId,
      } as typeof set.headers;
    },
  )
  .mapResponse({ as: "global" }, ({ response, requestId }): Response | undefined => {
    if (!(response instanceof Response)) {
      return;
    }

    const headers = new Headers(response.headers);
    headers.set("X-Request-Id", requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
