// File System Access API type declarations
// https://wicg.github.io/file-system-access/

interface FileSystemDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
  requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  queryPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  readonly name: string
  entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
  values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>
  keys(): AsyncIterableIterator<string>
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
  readonly name: string
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | { type: string; data?: BufferSource | Blob | string; position?: number; size?: number }): Promise<void>
  seek(position: number): Promise<void>
  truncate(size: number): Promise<void>
  close(): Promise<void>
}

interface ShowDirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}

interface Window {
  showDirectoryPicker(options?: ShowDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}
