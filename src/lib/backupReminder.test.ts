import { describe, expect, it } from "vitest";
import { formatSince, shouldNudgeBackup } from "./backupReminder";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const entries = (count: number, at: number) => Array.from({ length: count }, (_, i) => at + i);

describe("shouldNudgeBackup", () => {
  it("no avisa con pocas entradas nuevas", () => {
    expect(shouldNudgeBackup(entries(9, NOW - 30 * DAY), NOW, null, null)).toBe(false);
  });

  it("sin copia, avisa cuando la primera entrada tiene más de 14 días", () => {
    expect(shouldNudgeBackup(entries(10, NOW - 13 * DAY), NOW, null, null)).toBe(false);
    expect(shouldNudgeBackup(entries(10, NOW - 15 * DAY), NOW, null, null)).toBe(true);
  });

  it("solo cuenta las entradas posteriores a la última copia", () => {
    const last = NOW - 20 * DAY;
    const ts = [...entries(30, last - 10 * DAY), ...entries(5, last + DAY)];
    expect(shouldNudgeBackup(ts, NOW, last, null)).toBe(false);
    expect(shouldNudgeBackup([...ts, ...entries(5, last + 2 * DAY)], NOW, last, null)).toBe(true);
  });

  it("no avisa si la copia es reciente aunque haya muchas entradas", () => {
    expect(shouldNudgeBackup(entries(50, NOW - DAY), NOW, NOW - 2 * DAY, null)).toBe(false);
  });

  it("se apaga una semana tras abrir Ajustes", () => {
    const ts = entries(20, NOW - 40 * DAY);
    expect(shouldNudgeBackup(ts, NOW, null, NOW - 6 * DAY)).toBe(false);
    expect(shouldNudgeBackup(ts, NOW, null, NOW - 8 * DAY)).toBe(true);
  });
});

describe("formatSince", () => {
  it("usa días, meses y años", () => {
    expect(formatSince(NOW, "es", NOW)).toBe("hoy");
    expect(formatSince(NOW - 3 * DAY, "es", NOW)).toBe("hace 3 días");
    expect(formatSince(NOW - 60 * DAY, "en", NOW)).toBe("2 months ago");
  });
});
