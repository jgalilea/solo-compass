/**
 * Files handed to the app other than with an import button: dropped on
 * the window, opened with the installed app (the manifest's
 * `file_handlers`, through `launchQueue`) or shared to it (its
 * `share_target`, kept for a moment by the service worker,
 * public/share-target.js). They wait here, in order, for the dialog
 * that looks at each one and asks what to do (IncomingFileDialog, drawn
 * once by Layout through IncomingFiles). An import button handed the
 * wrong kind of file (a backup in the journal's) passes it on here too.
 *
 * In the main bundle, so it's kept small: what reads the files
 * (fileImport.ts) is in the dialog's chunk.
 */

/** More at once than anyone means to open; the rest are left out. */
const MAX_WAITING = 10;

/**
 * How a file got here. "shared" may not be the player's doing: any web
 * page can post a file to the share target, so the dialog says so.
 */
export type FileSource = "button" | "dropped" | "opened" | "shared";

export interface IncomingFile {
  file: File;
  source: FileSource;
}

let waiting: readonly IncomingFile[] = [];
const listeners = new Set<() => void>();

function set(next: readonly IncomingFile[]) {
  waiting = next;
  for (const listener of listeners) listener();
}

/** Files to open, after any already waiting. */
export function offerFiles(files: readonly File[], source: FileSource): void {
  if (files.length)
    set([...waiting, ...files.map((file) => ({ file, source }))].slice(0, MAX_WAITING));
}

/** The file the dialog is showing, if any. */
export function currentFile(): IncomingFile | null {
  return waiting[0] ?? null;
}

/** How many wait after the current one. */
export function filesAfterCurrent(): number {
  return Math.max(0, waiting.length - 1);
}

/** Done with the current file (opened or not): the next one, if any. */
export function dismissCurrentFile(): void {
  set(waiting.slice(1));
}

export function subscribeIncomingFiles(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Where the service worker keeps the files shared to the app until it
 * opens (public/share-target.js writes it: keep the name in step).
 */
const SHARED_CACHE = "solo-compass-shared-files";

/** The search parameter the service worker sends the app to after a share (`#/?compartido`). */
export const SHARED_PARAM = "compartido";

/** The files shared to the app, taken out of the service worker's cache (and the cache removed). */
export async function takeSharedFiles(): Promise<File[]> {
  if (!("caches" in window)) return [];
  try {
    const cache = await caches.open(SHARED_CACHE);
    const files: File[] = [];
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      if (!response) continue;
      let name = "";
      try {
        name = decodeURIComponent(response.headers.get("x-file-name") ?? "");
      } catch {
        // A name that can't be read: the file still opens, nameless.
      }
      files.push(
        new File([await response.blob()], name, {
          type: response.headers.get("x-file-type") ?? "",
        }),
      );
    }
    await caches.delete(SHARED_CACHE);
    return files;
  } catch {
    return [];
  }
}

// Chromium's File Handling API: files opened with the installed app.
interface LaunchParams {
  readonly files: readonly FileSystemFileHandle[];
}
interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}

/** Files opened with the installed app ("Open with Solo Compass") go to the dialog. */
export function watchLaunchedFiles(): void {
  const queue = (window as Window & { launchQueue?: LaunchQueue }).launchQueue;
  queue?.setConsumer((params) => {
    if (!params.files?.length) return;
    Promise.all(params.files.map((handle) => handle.getFile())).then(
      (files) => offerFiles(files, "opened"),
      () => {},
    );
  });
}
