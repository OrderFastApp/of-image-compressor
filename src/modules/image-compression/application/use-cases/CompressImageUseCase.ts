import type { EnvConfig } from "@/shared/config/env";
import { getMaxUploadSizeBytes } from "@/shared/config/env";
import { CompressionOptions } from "../../domain/entities/CompressionOptions";
import { CompressionResult } from "../../domain/entities/CompressionResult";
import { ImageFile } from "../../domain/entities/ImageFile";
import { InvalidCompressionOptionsError } from "../../domain/errors/InvalidCompressionOptionsError";
import { InvalidImageTypeError } from "../../domain/errors/InvalidImageTypeError";
import type {
  ImageValidationService,
  ValidationLimits,
} from "../../domain/services/ImageValidationService";
import { Dimensions } from "../../domain/value-objects/Dimensions";
import { isAllowedMimeType } from "../../domain/value-objects/ImageMimeType";
import type { OutputFormat } from "../../domain/value-objects/OutputFormat";
import { Quality } from "../../domain/value-objects/Quality";
import type { CompressImageInput } from "../dtos/CompressImageInput";
import type { CompressImageOutput } from "../dtos/CompressImageOutput";
import type { ImageCompressorPort } from "../ports/ImageCompressorPort";
import type { ImageMetadataReaderPort } from "../ports/ImageMetadataReaderPort";

export class CompressImageUseCase {
  constructor(
    private readonly compressor: ImageCompressorPort,
    private readonly metadataReader: ImageMetadataReaderPort,
    private readonly validationService: ImageValidationService,
    private readonly envConfig: EnvConfig,
  ) {}

  async execute(input: CompressImageInput): Promise<CompressImageOutput> {
    if (!isAllowedMimeType(input.mimeType)) {
      throw new InvalidImageTypeError("Formato de imagen no soportado");
    }

    const image = new ImageFile(input.fileBuffer, input.originalFilename, input.mimeType);

    const limits: ValidationLimits = {
      maxUploadSizeBytes: getMaxUploadSizeBytes(this.envConfig),
      maxImageWidth: this.envConfig.MAX_IMAGE_WIDTH,
      maxImageHeight: this.envConfig.MAX_IMAGE_HEIGHT,
    };

    this.validationService.validateImageFile(image, limits);

    const qualityValue = input.quality ?? this.envConfig.DEFAULT_QUALITY;
    const quality = Quality.tryCreate(qualityValue);
    if (!quality) {
      throw new InvalidCompressionOptionsError("Quality must be an integer between 1 and 100");
    }

    const outputFormat: OutputFormat = input.outputFormat ?? this.envConfig.DEFAULT_OUTPUT_FORMAT;

    const options = new CompressionOptions(quality, outputFormat, input.maxWidth, input.maxHeight);

    this.validationService.validateCompressionOptions(options);

    const metadata = await this.metadataReader.read(image.buffer);

    if (!metadata.width || !metadata.height) {
      throw new InvalidImageTypeError("Unable to read image dimensions");
    }

    const dimensions = new Dimensions(metadata.width, metadata.height);
    this.validationService.validateDimensions(dimensions, limits);

    const { buffer } = await this.compressor.compress({ image, options });

    const outputFilename = this.buildOutputFilename(input.originalFilename, outputFormat);

    const result = new CompressionResult({
      fileBuffer: buffer,
      filename: outputFilename,
      outputFormat,
      originalSize: image.size.bytes,
    });

    return {
      fileBuffer: result.fileBuffer,
      filename: result.filename,
      mimeType: result.mimeType,
      outputFormat: result.outputFormat,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio,
    };
  }

  private buildOutputFilename(originalFilename: string, outputFormat: OutputFormat): string {
    const baseName = originalFilename.replace(/\.[^.]+$/, "") || "image";
    const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const extension = outputFormat === "jpeg" ? "jpg" : outputFormat;
    return `optimized-${sanitized}.${extension}`;
  }
}
