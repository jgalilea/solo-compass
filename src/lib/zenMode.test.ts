import { describe, expect, it } from "vitest";
import type { JournalEntry } from "./lonelog";
import { isStoryEntry } from "./zenMode";

const entry = (kind: JournalEntry["kind"], text: string): JournalEntry => ({ id: text, adventureId: "a", timestamp: 0, kind, text });

describe("zen mode: what's part of the story", () => {
  it("keeps what's told", () => {
    for (const [kind, text] of [
      ["session", "Sesión 1"],
      ["scene", "S1 *La posada*"],
      ["action", "(Odile) Sube la escalera"],
      ["consequence", "La puerta cede"],
      ["note", "Llueve sobre [L:Puerto gris] desde hace días."],
      ["note", 'N (Odile): "¿Quién anda ahí?"'],
      ["note", "\\--- Se busca: el ladrón de la torre ---\\"],
    ] as const) {
      expect(isStoryEntry(entry(kind, text))).toBe(true);
    }
  });

  it("leaves out the dice, the oracle and the bookkeeping", () => {
    for (const [kind, text] of [
      ["question", "¿Hay alguien en la torre?"],
      ["roll", "Recluse: blanco 5, negro 2 -> Sí"],
      ["roll", "Ataque d20+5 -> 19 (14 + 5)"],
      ["note", "(nota: esta escena va rápida)"],
      ["note", "[COMBAT]"],
      ["note", "Rd1: el orco ataca"],
      ["note", "[Clock:Alarma 3/6]"],
      ["note", "[N:Odile|herida] [L:Torre vieja|derruida]"],
    ] as const) {
      expect(isStoryEntry(entry(kind, text))).toBe(false);
    }
  });
});
