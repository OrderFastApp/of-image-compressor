import { ERROR_CODES } from "@/shared/http/errorCodes";

const errorResponseSchema = {
  type: "object" as const,
  properties: {
    success: { type: "boolean" as const, example: false },
    error: {
      type: "object" as const,
      properties: {
        code: { type: "string" as const },
        message: { type: "string" as const },
      },
      required: ["code", "message"],
    },
  },
  required: ["success", "error"],
};

export const compressImageOpenApiDetail = {
  summary: "Compress and optimize an image",
  description:
    "Accepts a multipart/form-data upload with an image file and optional compression parameters. Returns the optimized image as binary data with compression metrics in response headers.",
  tags: ["Images"],
  requestBody: {
    required: true,
    content: {
      "multipart/form-data": {
        schema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              format: "binary",
              description: "Image file to compress (jpeg, png, webp, avif, gif, svg)",
            },
            quality: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              description: "Compression quality (1-100). Default from server config.",
            },
            outputFormat: {
              type: "string",
              enum: ["jpeg", "png", "webp", "avif"],
              description: "Desired output format. Default from server config.",
            },
            maxWidth: {
              type: "integer",
              minimum: 1,
              description: "Maximum width in pixels (resize with fit inside)",
            },
            maxHeight: {
              type: "integer",
              minimum: 1,
              description: "Maximum height in pixels (resize with fit inside)",
            },
            aspectRatio: {
              type: "string",
              pattern: "^\\d+:\\d+$",
              description:
                'Target aspect ratio in "W:H" format (e.g. "16:9", "1:1"). Crops the image centered to match the ratio. Optionally combined with maxWidth/maxHeight to constrain output size.',
              example: "16:9",
            },
          },
          required: ["file"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Compressed image binary",
      headers: {
        "Content-Type": {
          schema: { type: "string" },
          description: "MIME type of the optimized image",
        },
        "Content-Disposition": {
          schema: { type: "string" },
          description: "Attachment filename",
        },
        "X-Original-Size": {
          schema: { type: "integer" },
          description: "Original file size in bytes",
        },
        "X-Compressed-Size": {
          schema: { type: "integer" },
          description: "Compressed file size in bytes",
        },
        "X-Compression-Ratio": {
          schema: { type: "number" },
          description: "Percentage of size reduction",
        },
        "X-Output-Format": {
          schema: { type: "string", enum: ["jpeg", "png", "webp", "avif"] },
          description: "Output format used",
        },
      },
      content: {
        "image/*": {
          schema: { type: "string", format: "binary" },
        },
      },
    },
    400: {
      description: "Invalid image type or compression options",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: {
            success: false,
            error: {
              code: ERROR_CODES.INVALID_IMAGE_TYPE,
              message: "Unsupported image format",
            },
          },
        },
      },
    },
    413: {
      description: "Image too large",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: {
            success: false,
            error: {
              code: ERROR_CODES.IMAGE_TOO_LARGE,
              message: "Image exceeds the maximum allowed size or dimensions",
            },
          },
        },
      },
    },
    422: {
      description: "Invalid request payload",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: {
            success: false,
            error: {
              code: ERROR_CODES.INVALID_REQUEST,
              message: "File is required",
            },
          },
        },
      },
    },
    500: {
      description: "Compression failed",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: {
            success: false,
            error: {
              code: ERROR_CODES.COMPRESSION_FAILED,
              message: "Image compression failed",
            },
          },
        },
      },
    },
  },
};
