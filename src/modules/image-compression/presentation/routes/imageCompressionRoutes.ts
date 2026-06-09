import { Elysia } from "elysia";
import type { ImageCompressionController } from "../controllers/ImageCompressionController";
import { compressImageOpenApiDetail } from "../openapi/compressImageOpenApi";

export function createImageCompressionRoutes(controller: ImageCompressionController) {
  return new Elysia({ prefix: "/api/v1/images" }).post(
    "/compress",
    ({ request }) => controller.compress(request),
    {
      detail: compressImageOpenApiDetail,
    },
  );
}
