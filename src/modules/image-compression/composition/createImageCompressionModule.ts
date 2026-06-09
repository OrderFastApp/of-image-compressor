import { Elysia } from "elysia";
import type { ImageCompressionController } from "../presentation/controllers/ImageCompressionController";
import { createImageCompressionRoutes } from "../presentation/routes/imageCompressionRoutes";

export function createImageCompressionModule(controller: ImageCompressionController) {
  return new Elysia({ name: "image-compression-module" }).use(
    createImageCompressionRoutes(controller),
  );
}
