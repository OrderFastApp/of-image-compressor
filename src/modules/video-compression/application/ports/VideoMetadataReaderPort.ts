export type VideoMetadata = {
  durationSeconds: number;
  width?: number;
  height?: number;
  format?: string;
};

export interface VideoMetadataReaderPort {
  read(filePath: string): Promise<VideoMetadata>;
}
