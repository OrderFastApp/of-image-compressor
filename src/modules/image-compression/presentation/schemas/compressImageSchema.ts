import { z } from "zod";
import { OUTPUT_FORMATS } from "../../domain/value-objects/OutputFormat";

const optionalPositiveInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return undefined;
    }
    const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  })
  .pipe(z.number().int().positive().optional());

const optionalQuality = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return undefined;
    }
    const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  })
  .pipe(z.number().int().min(1).max(100).optional());

export const compressImageFormSchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
  quality: optionalQuality,
  outputFormat: z.enum(OUTPUT_FORMATS).optional(),
  maxWidth: optionalPositiveInt,
  maxHeight: optionalPositiveInt,
});

export type CompressImageFormInput = z.infer<typeof compressImageFormSchema>;
