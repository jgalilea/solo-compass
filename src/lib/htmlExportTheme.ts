import { EXPORT_COLOR_TOKENS, type ExportTheme } from "./htmlExport";

/** Each theme's display font file (public/fonts), by family. */
const FONT_FILES: Record<string, string> = {
  Cinzel: "cinzel-700.woff2",
  "Playfair Display": "playfair-700.woff2",
  "Share Tech Mono": "sharetech-400.woff2",
  "Pirata One": "pirata-400.woff2",
};

/**
 * The theme the app is showing right now, for the HTML export: its
 * colour tokens as computed (so light/dark mode is already applied)
 * and its display font, read from the app's own files (the service
 * worker has them, so this works offline). Without the font, the page
 * still has the font stack.
 */
export async function readExportTheme(): Promise<ExportTheme> {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const colors = Object.fromEntries(EXPORT_COLOR_TOKENS.map((token) => [token, style.getPropertyValue(token).trim()]));
  const fontDisplay = style.getPropertyValue("--font-display").trim() || "Georgia, serif";
  const family = fontDisplay.split(",")[0].trim().replace(/^["']|["']$/g, "");
  const mode = root.dataset.mode === "light" ? "light" : "dark";

  const file = FONT_FILES[family];
  if (!file) return { colors, fontDisplay, mode };
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;/, "data:font/woff2;"));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { colors, fontDisplay, mode, font: { family, dataUrl } };
  } catch {
    return { colors, fontDisplay, mode };
  }
}
