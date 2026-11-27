import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLocaleContext } from "../hooks/useLocaleContext";
import {
  currentFile,
  dismissCurrentFile,
  filesAfterCurrent,
  offerFiles,
  SHARED_PARAM,
  subscribeIncomingFiles,
  takeSharedFiles,
  watchLaunchedFiles,
} from "../lib/incomingFiles";
import { preloadable } from "../lib/preloadable";
import { IconFileImport } from "./icons/Icons";

const IncomingFileDialog = preloadable(() =>
  import("./IncomingFileDialog").then((m) => m.IncomingFileDialog),
);

/** A key for each file handed over, so the dialog starts afresh with the next one. */
const fileIds = new WeakMap<File, number>();
let lastFileId = 0;
function fileId(file: File): number {
  let id = fileIds.get(file);
  if (id === undefined) fileIds.set(file, (id = ++lastFileId));
  return id;
}

/** Whether a drag carries files (not text or a link being moved around the page). */
function carriesFiles(e: DragEvent): boolean {
  return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
}

/**
 * Files handed to the app other than with an import button, drawn once
 * by Layout: dropped anywhere on the window (with a hint while one is
 * dragged over it), opened with the installed app, or shared to it. Each
 * one opens the dialog that says what it is (incomingFiles.ts).
 */
export function IncomingFiles() {
  const { t } = useLocaleContext();
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = useSyncExternalStore(subscribeIncomingFiles, currentFile);
  const after = useSyncExternalStore(subscribeIncomingFiles, filesAfterCurrent);
  const [dragging, setDragging] = useState(false);

  useEffect(() => watchLaunchedFiles(), []);

  // Shared to the app: the service worker sent it here with the files kept.
  const shared = new URLSearchParams(location.search).has(SHARED_PARAM);
  useEffect(() => {
    if (!shared) return;
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
    void takeSharedFiles().then((files) => offerFiles(files, "shared"));
  }, [shared, location.pathname, navigate]);

  // Dropped on the window. Without this, the browser would open the
  // file itself, leaving the app (and anything half-typed in it).
  useEffect(() => {
    // dragenter/dragleave fire for every element crossed: counted, so the
    // hint only goes once the drag has left the window.
    let depth = 0;
    function enter(e: DragEvent) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    }
    function over(e: DragEvent) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    }
    function leave(e: DragEvent) {
      if (!carriesFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    }
    function drop(e: DragEvent) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      offerFiles(Array.from(e.dataTransfer!.files), "dropped");
    }
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return (
    <>
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/85 p-6"
        >
          <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-gold/70 bg-ink-800 px-8 py-10 text-center shadow-2xl">
            <IconFileImport size={36} className="text-gold" />
            <p className="font-display text-xl text-parchment">{t.files.dropHere}</p>
            <p className="text-sm text-parchment-dim">{t.files.dropHint}</p>
          </div>
        </div>
      )}
      {incoming && (
        <Suspense fallback={null}>
          <IncomingFileDialog
            key={fileId(incoming.file)}
            file={incoming.file}
            shared={incoming.source === "shared"}
            after={after}
            onDone={dismissCurrentFile}
          />
        </Suspense>
      )}
    </>
  );
}
