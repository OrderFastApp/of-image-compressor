export type ImageMetadata = {
  width: number;
  height: number;
  format: string | undefined;
};

export interface ImageMetadataReaderPort {
  read(buffer: Uint8Array): Promise<ImageMetadata>;
}
