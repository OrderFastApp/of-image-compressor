import { VideoCompressionOptions } from "@/modules/video-compression/domain/entities/VideoCompressionOptions";
import { VideoFile } from "@/modules/video-compression/domain/entities/VideoFile";
import { InvalidVideoTypeError } from "@/modules/video-compression/domain/errors/InvalidVideoTypeError";
import { VideoTooLargeError } from "@/modules/video-compression/domain/errors/VideoTooLargeError";
import { VideoTooLongError } from "@/modules/video-compression/domain/errors/VideoTooLongError";
import { VideoValidationService } from "@/modules/video-compression/domain/services/VideoValidationService";
import { Duration } from "@/modules/video-compression/domain/value-objects/Duration";
import { VideoCrf } from "@/modules/video-compression/domain/value-objects/VideoCrf";
import { describe, expect, it } from "vitest";

const limits = {
  maxUploadSizeBytes: 10 * 1024 * 1024,
  maxDurationSeconds: 120,
};

describe("VideoValidationService", () => {
  const service = new VideoValidationService();

  it("acepta un video válido", () => {
    const video = new VideoFile(new Uint8Array([1, 2, 3]), "clip.mp4", "video/mp4");
    expect(() => service.validateVideoFile(video, limits)).not.toThrow();
  });

  it("rechaza archivo demasiado grande", () => {
    const video = new VideoFile(new Uint8Array(100), "clip.mp4", "video/mp4");
    expect(() => service.validateVideoFile(video, { ...limits, maxUploadSizeBytes: 10 })).toThrow(
      VideoTooLargeError,
    );
  });

  it("rechaza extensión que no coincide con MIME", () => {
    const video = new VideoFile(new Uint8Array([1, 2, 3]), "clip.webm", "video/mp4");
    expect(() => service.validateVideoFile(video, limits)).toThrow(InvalidVideoTypeError);
  });

  it("rechaza duración excesiva", () => {
    expect(() => service.validateDuration(new Duration(200), limits)).toThrow(VideoTooLongError);
  });

  it("valida opciones de compresión", () => {
    const options = new VideoCompressionOptions(VideoCrf.create(28), "mp4", 1280, 720);
    expect(() => service.validateCompressionOptions(options)).not.toThrow();
  });
});
