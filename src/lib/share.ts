/**
 * The system share sheet (Web Share API): send an adventure or a table
 * to another app (notes, messaging, email, a cloud drive…) without a
 * server. Offered only where the browser has it (phones, and
 * Chrome/Edge/Safari on desktop); elsewhere the download is still there.
 *
 * It's shared as a file when the system accepts one, and as plain text
 * otherwise.
 */

export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export type ShareOutcome = "shared" | "cancelled";

/**
 * Chromium-based browsers (Chrome, Edge, Samsung Internet… the ones
 * with `navigator.userAgentData`) only share a fixed list of
 * extensions, and .md isn't on it — but canShare() can still say yes,
 * and then share() fails once the tap has been used up, so it can't be
 * retried. There the same text goes as .txt straight away; Safari
 * takes the .md as is.
 */
function isChromium(): boolean {
  return "userAgentData" in navigator;
}

export async function shareTextFile(
  filename: string,
  content: string,
  title: string,
  type = "text/markdown",
): Promise<ShareOutcome> {
  const asText = new File([content], filename.replace(/\.(md|json)$/, ".txt"), { type: "text/plain" });
  const candidates = isChromium() ? [asText] : [new File([content], filename, { type }), asText];
  // As a last resort, the text itself instead of a file.
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
