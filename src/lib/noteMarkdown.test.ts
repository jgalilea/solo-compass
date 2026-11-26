import { describe, expect, it } from "vitest";
import { inlinePlainText, parseInline, readNoteLine, toggleNoteCheckbox } from "./noteMarkdown";

describe("parseInline", () => {
  it("leaves plain text alone", () => {
    expect(parseInline("La posadera no se fía.")).toEqual([{ kind: "text", text: "La posadera no se fía." }]);
  });

  it("reads bold, italic, struck and code", () => {
    expect(parseInline("un **ciervo** y *plata* ~~oro~~ `2d6`")).toEqual([
      { kind: "text", text: "un " },
      { kind: "strong", children: [{ kind: "text", text: "ciervo" }] },
      { kind: "text", text: " y " },
      { kind: "em", children: [{ kind: "text", text: "plata" }] },
      { kind: "text", text: " " },
      { kind: "del", children: [{ kind: "text", text: "oro" }] },
      { kind: "text", text: " " },
      { kind: "code", text: "2d6" },
    ]);
    expect(parseInline("__Capa Gris__ _paga_")).toEqual([
      { kind: "strong", children: [{ kind: "text", text: "Capa Gris" }] },
      { kind: "text", text: " " },
      { kind: "em", children: [{ kind: "text", text: "paga" }] },
    ]);
  });

  it("nests marks", () => {
    expect(parseInline("**el sello *del ciervo***")).toEqual([
      {
        kind: "strong",
        children: [{ kind: "text", text: "el sello " }, { kind: "em", children: [{ kind: "text", text: "del ciervo" }] }],
      },
    ]);
  });

  it("doesn't take loose asterisks, snake_case or unclosed marks for emphasis", () => {
    for (const text of ["5 * 3 * 2", "nombre_de_archivo", "**sin cerrar", "* suelto *", "a__b__c"]) {
      expect(parseInline(text)).toEqual([{ kind: "text", text }]);
    }
  });

  it("keeps an escaped mark as it is", () => {
    expect(parseInline(String.raw`\*no es cursiva\*`)).toEqual([{ kind: "text", text: "*no es cursiva*" }]);
  });

  it("reads links and bare web addresses, without the punctuation after them", () => {
    expect(parseInline("las [reglas](https://example.com/r.pdf) y https://example.com/a_b_c.")).toEqual([
      { kind: "text", text: "las " },
      { kind: "link", href: "https://example.com/r.pdf", children: [{ kind: "text", text: "reglas" }] },
      { kind: "text", text: " y " },
      { kind: "link", href: "https://example.com/a_b_c", children: [{ kind: "text", text: "https://example.com/a_b_c" }] },
      { kind: "text", text: "." },
    ]);
    // Only web links: nothing that would run a script.
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ kind: "text", text: "[x](javascript:alert(1))" }]);
  });

  it("reads as plain text without its marks", () => {
    expect(inlinePlainText(parseInline("**Ojo**: el *ciervo*"))).toBe("Ojo: el ciervo");
  });
});

describe("readNoteLine", () => {
  it("tells each kind of line", () => {
    expect(readNoteLine("- [ ] Averiguar quién paga")).toEqual({ kind: "check", checked: false, text: "Averiguar quién paga", depth: 0 });
    expect(readNoteLine("  - [x] Hecho")).toEqual({ kind: "check", checked: true, text: "Hecho", depth: 1 });
    expect(readNoteLine("* Antorcha")).toEqual({ kind: "bullet", text: "Antorcha", depth: 0 });
    expect(readNoteLine("    + Cuerda")).toEqual({ kind: "bullet", text: "Cuerda", depth: 2 });
    expect(readNoteLine("2. Ir al molino")).toEqual({ kind: "ordered", marker: "2.", text: "Ir al molino", depth: 0 });
    expect(readNoteLine("# Pistas")).toEqual({ kind: "heading", level: 1, text: "Pistas" });
    expect(readNoteLine("#### Muy dentro")).toEqual({ kind: "heading", level: 3, text: "Muy dentro" });
    expect(readNoteLine("> Nadie cruza el puente")).toEqual({ kind: "quote", text: "Nadie cruza el puente" });
    expect(readNoteLine("---")).toEqual({ kind: "rule" });
    expect(readNoteLine("   ")).toEqual({ kind: "gap" });
    expect(readNoteLine("Pendiente:")).toEqual({ kind: "text", text: "Pendiente:" });
  });

  it("needs the space after a heading's mark: a hashtag is text", () => {
    expect(readNoteLine("#pista")).toEqual({ kind: "text", text: "#pista" });
    expect(readNoteLine(String.raw`\# no es título`)).toEqual({ kind: "text", text: String.raw`\# no es título` });
  });
});

describe("toggleNoteCheckbox", () => {
  it("ticks and unticks only that line", () => {
    const notes = "Pendiente:\n- [ ] Uno\n  * [x] Dos";
    expect(toggleNoteCheckbox(notes, 1)).toBe("Pendiente:\n- [x] Uno\n  * [x] Dos");
    expect(toggleNoteCheckbox(notes, 2)).toBe("Pendiente:\n- [ ] Uno\n  * [ ] Dos");
    expect(toggleNoteCheckbox(notes, 0)).toBe(notes);
    expect(toggleNoteCheckbox(notes, 9)).toBe(notes);
  });
});
