export type TempFileWriteInput = {
  buffer: Uint8Array;
  filename: string;
};

export type TempFileWriteResult = {
  path: string;
  filename: string;
  size: number;
};

export interface TempFileStoragePort {
  write(input: TempFileWriteInput): Promise<TempFileWriteResult>;
  createOutputPath(filename: string): Promise<string>;
  read(path: string): Promise<Uint8Array>;
  size(path: string): Promise<number>;
  delete(path: string): Promise<void>;
}
