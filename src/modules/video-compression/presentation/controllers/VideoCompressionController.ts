import { AppError } from "@/shared/errors/AppError";
import { InvalidRequestError } from "@/shared/errors/InvalidRequestError";
import { ERROR_CODES } from "@/shared/http/errorCodes";
import type { Logger } from "@/shared/logger/logger";
import type { CompressVideoUseCase } from "../../application/use-cases/CompressVideoUseCase";
import type { DownloadCompressedVideoUseCase } from "../../application/use-cases/DownloadCompressedVideoUseCase";
import {
  type CompressVideoFormInput,
  compressVideoFormSchema,
} from "../schemas/compressVideoSchema";

type RequestContext = {
  requestId: string;
  requestLogger: Logger;
};

function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export class VideoCompressionController {
  constructor(
    private readonly compressVideoUseCase: CompressVideoUseCase,
    private readonly downloadCompressedVideoUseCase: DownloadCompressedVideoUseCase,
  ) {}

  async compress(request: Request, context: RequestContext): Promise<Response> {
    const { requestLogger, requestId } = context;
    const startedAt = Date.now();

    const formData = await request.formData();
    const parsed = this.parseFormData(formData);

    requestLogger.debug("Parsing compress video form data", {
      filename: this.sanitizeFilename(parsed.file.name),
      mimeType: parsed.file.type || "application/octet-stream",
      fileSizeBytes: parsed.file.size,
      quality: parsed.quality,
      outputFormat: parsed.outputFormat,
      maxWidth: parsed.maxWidth,
      maxHeight: parsed.maxHeight,
    });

    const arrayBuffer = await parsed.file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(formatSseEvent(event, data)));
        };

        try {
          const result = await this.compressVideoUseCase.execute(
            {
              fileBuffer,
              originalFilename: this.sanitizeFilename(parsed.file.name),
              mimeType: parsed.file.type || "application/octet-stream",
              quality: parsed.quality,
              outputFormat: parsed.outputFormat,
              maxWidth: parsed.maxWidth,
              maxHeight: parsed.maxHeight,
            },
            (percent) => {
              send("progress", { percent });
            },
            { requestId },
          );

          const durationMs = Date.now() - startedAt;
          requestLogger.info("Compress video request completed", {
            downloadId: result.downloadId,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            outputFormat: result.outputFormat,
            filename: result.filename,
            durationMs,
          });

          send("complete", {
            downloadUrl: result.downloadUrl,
            filename: result.filename,
            mimeType: result.mimeType,
            outputFormat: result.outputFormat,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            expiresAt: result.expiresAt,
          });
        } catch (error) {
          const { code, message } = this.mapStreamError(error);
          requestLogger.error("Compress video request failed", {
            code,
            message,
            durationMs: Date.now() - startedAt,
          });
          send("error", { code, message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  async download(id: string, context: RequestContext): Promise<Response> {
    const { requestLogger, requestId } = context;
    const startedAt = Date.now();

    const result = await this.downloadCompressedVideoUseCase.execute(id, {
      requestId,
      requestLogger,
    });

    requestLogger.info("Download compressed video completed", {
      downloadId: id,
      filename: result.filename,
      compressedSize: result.compressedSize,
      durationMs: Date.now() - startedAt,
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

  private parseFormData(formData: FormData): CompressVideoFormInput {
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new InvalidRequestError("File is required");
    }

    const result = compressVideoFormSchema.safeParse({
      file,
      quality: formData.get("quality") ?? undefined,
      outputFormat: formData.get("outputFormat") ?? undefined,
      maxWidth: formData.get("maxWidth") ?? undefined,
      maxHeight: formData.get("maxHeight") ?? undefined,
    });

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(", ");
      throw new InvalidRequestError(message);
    }

    return result.data;
  }

  private sanitizeFilename(filename: string): string {
    const base = filename.split(/[/\\]/).pop() ?? "video";
    return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "video";
  }

  private mapStreamError(error: unknown): { code: string; message: string } {
    if (error instanceof AppError) {
      return { code: error.code, message: error.message };
    }

    if (error instanceof Error) {
      return { code: ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }

    return { code: ERROR_CODES.INTERNAL_ERROR, message: "Unexpected error" };
  }
}
