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

export const compressVideoOpenApiDetail = {
  summary: "Compress a video with SSE progress",
  description:
    "Accepts a multipart/form-data video upload and streams Server-Sent Events with compression progress. On completion, returns a temporary download URL.",
  tags: ["Videos"],
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
              description: "Video file to compress (mp4, webm, mov, avi, mkv)",
            },
            quality: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              description:
                "UX quality 1-100 mapped to ffmpeg CRF. If omitted, DEFAULT_VIDEO_CRF is used.",
            },
            outputFormat: {
              type: "string",
              enum: ["mp4", "webm"],
              description: "Desired output format. Default from server config.",
            },
            maxWidth: {
              type: "integer",
              minimum: 1,
              description: "Maximum width in pixels (scale keeping aspect ratio)",
            },
            maxHeight: {
              type: "integer",
              minimum: 1,
              description: "Maximum height in pixels (scale keeping aspect ratio)",
            },
          },
          required: ["file"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "SSE stream with progress and complete events",
      content: {
        "text/event-stream": {
          schema: {
            type: "string",
            example:
              'event: progress\ndata: {"percent":42.5}\n\nevent: complete\ndata: {"downloadUrl":"/api/v1/videos/download/..."}\n\n',
          },
        },
      },
    },
    400: {
      description: "Invalid video type or compression options",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: {
            success: false,
            error: {
              code: ERROR_CODES.INVALID_VIDEO_TYPE,
              message: "Unsupported video format",
            },
          },
        },
      },
    },
    413: {
      description: "Video too large or too long",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: {
            success: false,
            error: {
              code: ERROR_CODES.VIDEO_TOO_LARGE,
              message: "Video exceeds the maximum allowed size",
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
              code: ERROR_CODES.VIDEO_COMPRESSION_FAILED,
              message: "Video compression failed",
            },
          },
        },
      },
    },
  },
};

export const downloadCompressedVideoOpenApiDetail = {
  summary: "Download a compressed video",
  description:
    "Downloads a previously compressed video by temporary id. The link remains valid until the TTL expires and can be downloaded multiple times.",
  tags: ["Videos"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "Temporary download id from the compress complete event",
    },
  ],
  responses: {
    200: {
      description: "Compressed video binary",
      headers: {
        "Content-Type": {
          schema: { type: "string" },
          description: "MIME type of the optimized video",
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
          schema: { type: "string", enum: ["mp4", "webm"] },
          description: "Output format used",
        },
      },
      content: {
        "video/*": {
          schema: { type: "string", format: "binary" },
        },
      },
    },
    404: {
      description: "Download not found or expired",
      content: {
        "application/json": {
          schema: errorResponseSchema,
          example: {
            success: false,
            error: {
              code: ERROR_CODES.VIDEO_DOWNLOAD_NOT_FOUND,
              message: "Compressed video not found or expired",
            },
          },
        },
      },
    },
  },
};
