import { Elysia } from "elysia";
import type { VideoCompressionController } from "../presentation/controllers/VideoCompressionController";
import { createVideoCompressionRoutes } from "../presentation/routes/videoCompressionRoutes";

export function createVideoCompressionModule(controller: VideoCompressionController) {
  return new Elysia({ name: "video-compression-module" }).use(
    createVideoCompressionRoutes(controller),
  );
}
