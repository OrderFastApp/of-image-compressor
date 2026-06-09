import type { CompressionOptions } from "../../domain/entities/CompressionOptions";
import type { ImageFile } from "../../domain/entities/ImageFile";
import type { OutputFormat } from "../../domain/value-objects/OutputFormat";

export type ImageCompressionRequest = {
  image: ImageFile;
  options: CompressionOptions;
};

export type ImageCompressionResponse = {
  buffer: Uint8Array;
  outputFormat: OutputFormat;
};

export interface ImageCompressorPort {
  compress(request: ImageCompressionRequest): Promise<ImageCompressionResponse>;
}
