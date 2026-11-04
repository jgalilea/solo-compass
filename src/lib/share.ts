/**
 * The system share sheet (Web Share API): send an adventure or a table
 * to another app (notes, messaging, email, a cloud drive…) without a
 * server. Offered only where the browser has it (phones, and
 * Chrome/Edge/Safari on desktop); elsewhere the download is still there.
 *
 * It's shared as a file when the system accepts one (so the other app
 * gets a real .md), and as plain text otherwise.
 */

export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export type ShareOutcome = "shared" | "cancelled";

export async function shareTextFile(filename: string, content: string, title: string): Promise<ShareOutcome> {
  // Not every system accepts .md: then the same text as .txt, and as a
  // last resort the text itself.
  const candidates = [
    new File([content], filename, { type: "text/markdown" }),
    new File([content], filename.replace(/\.md$/, ".txt"), { type: "text/plain" }),
  ];
  const file = candidates.find((f) => navigator.canShare?.({ files: [f] }));
  try {
    await navigator.share(file ? { files: [file], title } : { title, text: content });
    return "shared";
  } catch (err) {
    // Closing the share sheet isn't an error.
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    throw err;
  }
}
