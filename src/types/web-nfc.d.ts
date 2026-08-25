// Minimal ambient types for the Web NFC API (NDEFReader), which isn't part
// of TypeScript's bundled DOM lib yet. Kept intentionally small — just
// enough surface for reading/writing a single text record, which is all
// this app uses. Supported only in Chrome on Android behind a secure
// context + user gesture; every call site here already feature-detects
// via `"NDEFReader" in window` before touching any of this.

interface NDEFRecordInit {
  recordType: string;
  mediaType?: string;
  id?: string;
  lang?: string;
  encoding?: string;
  data?: BufferSource | string;
}

interface NDEFWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

interface NDEFScanOptions {
  signal?: AbortSignal;
}

interface NDEFRecord {
  readonly recordType: string;
  readonly mediaType: string | null;
  readonly id: string | null;
  readonly data: DataView | null;
  readonly encoding: string | null;
  readonly lang: string | null;
}

interface NDEFMessage {
  readonly records: readonly NDEFRecord[];
}

interface NDEFReadingEvent extends Event {
  readonly serialNumber: string;
  readonly message: NDEFMessage;
}

interface NDEFReaderEventMap {
  reading: NDEFReadingEvent;
  readingerror: Event;
}

declare class NDEFReader {
  constructor();
  scan(options?: NDEFScanOptions): Promise<void>;
  write(
    message: string | BufferSource | { records: NDEFRecordInit[] },
    options?: NDEFWriteOptions
  ): Promise<void>;
  addEventListener<K extends keyof NDEFReaderEventMap>(
    type: K,
    listener: (this: NDEFReader, ev: NDEFReaderEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof NDEFReaderEventMap>(
    type: K,
    listener: (this: NDEFReader, ev: NDEFReaderEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

interface Window {
  NDEFReader?: typeof NDEFReader;
}
