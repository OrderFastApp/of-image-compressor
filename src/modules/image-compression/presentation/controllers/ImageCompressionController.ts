import { InvalidRequestError } from "@/shared/errors/InvalidRequestError";
import type { Logger } from "@/shared/logger/logger";
import type { CompressImageUseCase } from "../../application/use-cases/CompressImageUseCase";
import {
  type CompressImageFormInput,
  compressImageFormSchema,
} from "../schemas/compressImageSchema";

type CompressRequestContext = {
  requestId: string;
  requestLogger: Logger;
};

export class ImageCompressionController {
  constructor(private readonly compressImageUseCase: CompressImageUseCase) {}

  async compress(request: Request, context: CompressRequestContext): Promise<Response> {
    const { requestLogger, requestId } = context;
    const startedAt = Date.now();

    const formData = await request.formData();
    const parsed = this.parseFormData(formData);

    requestLogger.debug("Parsing compress form data", {
      filename: this.sanitizeFilename(parsed.file.name),
      mimeType: parsed.file.type || "application/octet-stream",
      fileSizeBytes: parsed.file.size,
      quality: parsed.quality,
      outputFormat: parsed.outputFormat,
      maxWidth: parsed.maxWidth,
      maxHeight: parsed.maxHeight,
      aspectRatio: parsed.aspectRatio,
    });

    const arrayBuffer = await parsed.file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const result = await this.compressImageUseCase.execute(
      {
        fileBuffer,
        originalFilename: this.sanitizeFilename(parsed.file.name),
        mimeType: parsed.file.type || "application/octet-stream",
        quality: parsed.quality,
        outputFormat: parsed.outputFormat,
        maxWidth: parsed.maxWidth,
        maxHeight: parsed.maxHeight,
        aspectRatio: parsed.aspectRatio,
      },
      { requestId },
    );

    const durationMs = Date.now() - startedAt;

    requestLogger.info("Compress request completed", {
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio,
      outputFormat: result.outputFormat,
      filename: result.filename,
      durationMs,
    });

    return new Response(result.fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Original-Size": String(result.originalSize),
        "X-Compressed-Size": String(result.compressedSize),
        "X-Compression-Ratio": String(result.compressionRatio),
        "X-Output-Format": result.outputFormat,
      },
    });
  }

  private parseFormData(formData: FormData): CompressImageFormInput {
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new InvalidRequestError("File is required");
    }

    const result = compressImageFormSchema.safeParse({
      file,
      quality: formData.get("quality") ?? undefined,
      outputFormat: formData.get("outputFormat") ?? undefined,
      maxWidth: formData.get("maxWidth") ?? undefined,
      maxHeight: formData.get("maxHeight") ?? undefined,
      aspectRatio: formData.get("aspectRatio") ?? undefined,
    });

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(", ");
      throw new InvalidRequestError(message);
    }

    return result.data;
  }

  private sanitizeFilename(filename: string): string {
    const base = filename.split(/[/\\]/).pop() ?? "image";
    return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  }
}
