import { InvalidRequestError } from "@/shared/errors/InvalidRequestError";
import type { CompressImageUseCase } from "../../application/use-cases/CompressImageUseCase";
import {
  type CompressImageFormInput,
  compressImageFormSchema,
} from "../schemas/compressImageSchema";

export class ImageCompressionController {
  constructor(private readonly compressImageUseCase: CompressImageUseCase) {}

  async compress(request: Request): Promise<Response> {
    const formData = await request.formData();
    const parsed = this.parseFormData(formData);

    const arrayBuffer = await parsed.file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const result = await this.compressImageUseCase.execute({
      fileBuffer,
      originalFilename: this.sanitizeFilename(parsed.file.name),
      mimeType: parsed.file.type || "application/octet-stream",
      quality: parsed.quality,
      outputFormat: parsed.outputFormat,
      maxWidth: parsed.maxWidth,
      maxHeight: parsed.maxHeight,
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
