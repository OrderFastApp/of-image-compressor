import { Elysia } from "elysia";
import type { VideoCompressionController } from "../controllers/VideoCompressionController";
import {
  compressVideoOpenApiDetail,
  downloadCompressedVideoOpenApiDetail,
} from "../openapi/compressVideoOpenApi";

export function createVideoCompressionRoutes(controller: VideoCompressionController) {
  return new Elysia({ prefix: "/api/v1/videos" })
    .post(
      "/compress",
      ({ request, requestId, requestLogger }) =>
        controller.compress(request, { requestId, requestLogger }),
      { detail: compressVideoOpenApiDetail },
    )
    .get(
      "/download/:id",
      ({ params, requestId, requestLogger }) =>
        controller.download(params.id, { requestId, requestLogger }),
      { detail: downloadCompressedVideoOpenApiDetail },
    );
}
