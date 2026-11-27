import { describe, expect, it } from "vitest";
import { BACKUP_SCHEMA_VERSION, restoreBackup } from "./backup";
import {
  decodeText,
  inspectFile,
  inspectJournal,
  inspectTables,
  inspectText,
  isOpenableFile,
  MAX_FILE_BYTES,
  MAX_TEXT_IMPORT_BYTES,
  type FileLike,
} from "./fileImport";
import { DICTIONARIES } from "./i18n/allDictionaries";

const t = DICTIONARIES.es;

function fileOf(name: string, content: string | Uint8Array, type = ""): FileLike {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  return { name, type, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer };
}

function backupJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: "solo-compass",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-11-20T18:30:00.000Z",
    history: [{ id: "r1" }, { id: "r2" }],
    journal: {
      adventures: [{ id: "a1", name: "La torre" }],
      entries: [{ id: "e1" }, { id: "e2" }, { id: "e3" }],
    },
    customTables: [{ id: "t1" }],
    settings: {},
    ...overrides,
  });
}

const JOURNAL = `---
title: "La torre"
---

=== Sesión 1 ===
S1 *La posada*
@ Pregunto por la torre
? ¿Sabe algo el posadero?
d: Recluse 5/2 -> Sí
=> Me habla de una cripta
`;

describe("file import: what can be opened", () => {
  it("by extension, or by type when there's none", () => {
    for (const name of ["diario.md", "DIARIO.MD", "notas.markdown", "copia.json", "copia.txt"]) {
      expect(isOpenableFile(name, "")).toBe(true);
    }
    for (const name of ["foto.png", "libro.pdf", "partida.docx", "copia.json.zip", "script.js"]) {
      expect(isOpenableFile(name, "text/plain")).toBe(false);
    }
    expect(isOpenableFile("compartido", "text/plain")).toBe(true);
    expect(isOpenableFile("compartido", "application/json")).toBe(true);
    expect(isOpenableFile("compartido", "image/png")).toBe(false);
  });

  it("reads UTF-8 and Notepad's UTF-16, and refuses what isn't text", () => {
    expect(decodeText(new TextEncoder().encode("﻿añá"))).toBe("añá");
    const utf16 = new Uint8Array([0xff, 0xfe, 0x61, 0x00, 0xf1, 0x00]);
    expect(decodeText(utf16)).toBe("añ");
    // A PNG's first bytes, and a .docx (a zip).
    expect(decodeText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
    expect(decodeText(new TextEncoder().encode("PK\u0003\u0004word/document.xml"))).toBeNull();
    expect(decodeText(new TextEncoder().encode("texto\u0000oculto"))).toBeNull();
    // Latin-1 (not UTF-8): "ñ" alone is an invalid byte.
    expect(decodeText(new Uint8Array([0x61, 0xf1, 0x6f]))).toBeNull();
    expect(decodeText(new TextEncoder().encode("tabs\tand\r\nlines\f"))).toBe(
      "tabs\tand\r\nlines\f",
    );
  });

  it("refuses a file past the size limit without reading it", async () => {
    const huge: FileLike = {
      name: "copia.json",
      type: "application/json",
      size: MAX_FILE_BYTES + 1,
      arrayBuffer: () => Promise.reject(new Error("read")),
    };
    expect(await inspectFile(t, huge)).toMatchObject({ kind: "problem", problem: "tooBig" });
    expect(await inspectFile(t, fileOf("vacio.md", ""))).toMatchObject({
      kind: "problem",
      problem: "empty",
    });
    expect(await inspectFile(t, fileOf("foto.png", "x"))).toMatchObject({
      kind: "problem",
      problem: "unsupported",
    });
    expect(
      await inspectFile(t, fileOf("foto.md", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))),
    ).toMatchObject({
      kind: "problem",
      problem: "notText",
    });
  });

  it("a journal or tables past the text limit aren't imported", () => {
    const big = "a\n".repeat(MAX_TEXT_IMPORT_BYTES / 2 + 1);
    expect(inspectText(t, "enorme.md", big)).toMatchObject({ kind: "problem", problem: "tooBig" });
  });
});

describe("file import: what a file is", () => {
  it("a backup of the app's, with what it holds", async () => {
    const found = await inspectFile(
      t,
      fileOf("solo-compass-backup.json", backupJson(), "application/json"),
    );
    expect(found).toMatchObject({
      kind: "backup",
      exportedAt: Date.parse("2026-11-20T18:30:00.000Z"),
      adventures: 1,
      entries: 3,
      rolls: 2,
      tables: 1,
    });
    // Shared from Chromium it comes as .txt, and it's still a backup.
    expect(inspectText(t, "solo-compass-backup.txt", backupJson())).toMatchObject({
      kind: "backup",
    });
  });

  it("a backup from a newer version isn't restored, here nor by restoreBackup itself", async () => {
    const newer = backupJson({ schemaVersion: BACKUP_SCHEMA_VERSION + 1 });
    expect(inspectText(t, "copia.json", newer)).toMatchObject({
      kind: "problem",
      problem: "newerBackup",
    });
    await expect(restoreBackup(t, newer, "merge")).rejects.toThrow(t.files.problems.newerBackup);
  });

  it("a damaged backup, or someone else's JSON", () => {
    expect(inspectText(t, "copia.json", backupJson({ schemaVersion: "6" }))).toMatchObject({
      problem: "damaged",
    });
    expect(inspectText(t, "copia.json", backupJson({ history: null }))).toMatchObject({
      problem: "damaged",
    });
    expect(inspectText(t, "copia.json", '{"app": "solo-compass", "schemaV')).toMatchObject({
      problem: "damaged",
    });
    expect(
      inspectText(t, "otra.json", JSON.stringify({ app: "otra", schemaVersion: 1 })),
    ).toMatchObject({
      problem: "notOurs",
    });
    expect(inspectText(t, "lista.json", "[1, 2, 3]")).toMatchObject({ problem: "notOurs" });
  });

  it("tables in JSON, and in the Markdown the app exports", () => {
    const json = JSON.stringify({
      name: "Clima",
      dice: "d4",
      entries: ["Sol", "Lluvia", "Niebla", "Viento"],
    });
    expect(inspectText(t, "clima.json", json)).toMatchObject({
      kind: "tables",
      drafts: [{ name: "Clima", dice: "d4" }],
    });
    const md =
      "# Clima\n\n| d4 | Resultado |\n|---|---|\n| 1 | Sol |\n| 2 | Lluvia |\n| 3 | Niebla |\n| 4 | Viento |\n";
    expect(inspectText(t, "clima.md", md)).toMatchObject({
      kind: "tables",
      drafts: [{ name: "Clima" }],
    });
  });

  it("a journal, named by its campaign title or its file", () => {
    expect(inspectText(t, "partida.md", JOURNAL)).toMatchObject({
      kind: "journal",
      title: "La torre",
      entries: 6,
    });
    expect(inspectText(t, "mi partida.txt", "@ Abro la puerta\n=> Cruje")).toMatchObject({
      kind: "journal",
      title: "mi partida",
      entries: 2,
    });
    // Opens like JSON, but it's a journal starting with a tag.
    expect(inspectText(t, "torre.md", "[L:Torre vieja] La niebla sube")).toMatchObject({
      kind: "journal",
    });
  });

  it("what it was picked as decides a text that could be either", () => {
    const list = "Sol\nLluvia\nNiebla";
    expect(inspectText(t, "lista.txt", list)).toMatchObject({ kind: "journal" });
    expect(inspectText(t, "lista.txt", list, "tables")).toMatchObject({
      kind: "tables",
      drafts: [{ dice: "d3" }],
    });
    const md = "# Clima\n\n| d2 | Resultado |\n|---|---|\n| 1 | Sol |\n| 2 | Lluvia |\n";
    expect(inspectText(t, "clima.md", md, "journal")).toMatchObject({ kind: "journal" });
    expect(inspectText(t, "uno.txt", "Solo una línea", "tables")).toMatchObject({
      problem: "noTables",
    });
    // And the dialog's "it's the other one".
    expect(inspectTables(t, "lista.txt", list)).toMatchObject({ kind: "tables" });
    expect(inspectJournal("clima.md", md)).toMatchObject({ kind: "journal" });
  });

  it("nothing in it", () => {
    expect(inspectText(t, "blanco.md", "\n   \n\t\n")).toMatchObject({ problem: "empty" });
    expect(inspectText(t, "solo-cabecera.md", "---\ntitle: Nada\n---\n")).toMatchObject({
      problem: "noJournal",
    });
  });
});
