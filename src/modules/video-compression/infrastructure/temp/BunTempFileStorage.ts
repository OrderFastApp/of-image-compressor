import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type {
  TempFileStoragePort,
  TempFileWriteInput,
  TempFileWriteResult,
} from "../../application/ports/TempFileStoragePort";

export class BunTempFileStorage implements TempFileStoragePort {
  constructor(private readonly baseDir: string) {}

  async write(input: TempFileWriteInput): Promise<TempFileWriteResult> {
    await this.ensureBaseDir();
    const safeName = this.sanitizeFilename(input.filename);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const path = join(this.baseDir, uniqueName);

    await Bun.write(path, input.buffer);

    return {
      path,
      filename: uniqueName,
      size: input.buffer.byteLength,
    };
  }

  async createOutputPath(filename: string): Promise<string> {
    await this.ensureBaseDir();
    const safeName = this.sanitizeFilename(filename);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    return join(this.baseDir, uniqueName);
  }

  async read(path: string): Promise<Uint8Array> {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      throw new Error(`Temp file not found: ${path}`);
    }
    return new Uint8Array(await file.arrayBuffer());
  }

  async size(path: string): Promise<number> {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      throw new Error(`Temp file not found: ${path}`);
    }
    return file.size;
  }

  async delete(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }

  private async ensureBaseDir(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
  }

  private sanitizeFilename(filename: string): string {
    const base = filename.split(/[/\\]/).pop() ?? "file";
    return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  }
}
