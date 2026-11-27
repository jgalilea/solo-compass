/**
 * Reading the sync's QR code with the device's camera, inside the app
 * (an iPhone's own camera would open the link in Safari, which keeps its
 * data apart from the installed app). The browser's own detector where
 * there is one (Chrome on Android, macOS), otherwise jsQR, its own chunk,
 * loaded only to scan. Every frame is read here: nothing leaves the
 * device.
 */

import { parseCode } from "./syncCode";
import { SYNC_LINK_PARAM } from "./syncStatus";

/** The code a scanned QR code holds: the app's link (`#/?vincular=…`) or the code alone. */
export function codeFromScan(text: string): string | null {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const query = url.hash.indexOf("?");
    const code = query >= 0 ? new URLSearchParams(url.hash.slice(query + 1)).get(SYNC_LINK_PARAM) : null;
    return code && parseCode(code) ? code : null;
  } catch {
    // Not a link: maybe the code itself.
  }
  return parseCode(trimmed) ? trimmed : null;
}

/**
 * Whether this device may have a camera to scan with (without asking for
 * it yet). Only a list of devices with none says no: before the camera
 * is allowed, Safari lists nothing at all, and an iPhone is where
 * scanning inside the app matters most. No camera after all: the dialog
 * says so.
 */
export async function hasCamera(): Promise<boolean> {
  const media = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
  if (!media?.getUserMedia) return false;
  try {
    const devices = (await media.enumerateDevices?.()) ?? [];
    return devices.length === 0 || devices.some((device) => device.kind === "videoinput");
  } catch {
    return true;
  }
}

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorClass {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

/** Frames are read this big at most: enough for a QR code on a screen, and quick. */
const READ_SIZE = 640;

/** A reader of what's in front of the camera: the QR code's text, or null. */
export async function qrReader(): Promise<(video: HTMLVideoElement) => Promise<string | null>> {
  const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  if (Detector) {
    try {
      if ((await Detector.getSupportedFormats()).includes("qr_code")) {
        const detector = new Detector({ formats: ["qr_code"] });
        return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
      }
    } catch {
      // Listed but not working: the library does it.
    }
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    if (!context || !video.videoWidth) return null;
    const scale = Math.min(1, READ_SIZE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    // The app draws it black on white, always.
    return jsQR(image.data, width, height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}
