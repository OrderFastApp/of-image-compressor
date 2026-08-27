export type CompressVideoProgressEvent = {
  type: "progress";
  percent: number;
};

export type CompressVideoCompleteEvent = {
  type: "complete";
  downloadId: string;
  downloadUrl: string;
  filename: string;
  mimeType: string;
  outputFormat: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  expiresAt: string;
};

export type CompressVideoErrorEvent = {
  type: "error";
  code: string;
  message: string;
};

export type CompressVideoStreamEvent =
  | CompressVideoProgressEvent
  | CompressVideoCompleteEvent
  | CompressVideoErrorEvent;
