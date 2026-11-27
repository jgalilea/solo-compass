import { describe, expect, it } from "vitest";
import { continuationOf } from "./continueAdventure";
import { DICTIONARIES, LONG_TEXTS } from "./i18n/allDictionaries";
import type { Adventure } from "./journal";
import {
  isImportedEntry,
  parseMarkdownToEntries,
  parseNotesFromMarkdown,
  parseDescriptionsFromMarkdown,
} from "./lonelog";
import { buildCast, type CastMember } from "./lonelogTags";
import { buildSampleAdventure } from "./sampleAdventure";
import { loadMeaningTables } from "./tableGames";

const state = (m: CastMember) => ({
  key: m.key,
  kind: m.kind,
  name: m.name,
  tags: m.tags,
  progress: m.progress,
  owner: m.owner,
});

describe("carrying on in a new adventure", () => {
  it("keeps the notebook exactly as it stands, every kind of element, in both languages", async () => {
    for (const lang of ["es", "en"] as const) {
      const t = DICTIONARIES[lang];
      // The sample uses every kind of element and every way to change one.
      const { markdown } = buildSampleAdventure(
        t,
        LONG_TEXTS[lang].sample,
        await loadMeaningTables("solo-compass", t, lang),
      );
      const entries = parseMarkdownToEntries(markdown, "old", 0);
      const from: Adventure = {
        id: "old",
        name: "La torre",
        createdAt: 0,
        updatedAt: 0,
        favorite: false,
        status: "ongoing",
        notes: parseNotesFromMarkdown(markdown),
        descriptions: parseDescriptionsFromMarkdown(markdown),
      };
      const log = continuationOf(from, entries, "Continúa «La torre».");
      const started = log.entries("new", 1000);

      expect(started).toHaveLength(1);
      expect(started[0]).toMatchObject({ adventureId: "new", timestamp: 1000, kind: "note" });
      expect(started[0].text.split("\n")[0]).toBe("Continúa «La torre».");
      expect(isImportedEntry(started[0])).toBe(false);
      expect(buildCast(started).map(state)).toEqual(buildCast(entries).map(state));
      expect(log.notes).toBe(from.notes);
      expect(log.notes).not.toBe("");
      expect(log.descriptions).toEqual(from.descriptions);
    }
  });

  it("an adventure with an empty notebook starts with just the note saying where it comes from", () => {
    const from: Adventure = {
      id: "a",
      name: "A",
      createdAt: 0,
      updatedAt: 0,
      favorite: false,
      status: "ongoing",
    };
    const log = continuationOf(from, [], "Continúa «A».");
    expect(log.entries("b", 5).map((e) => e.text)).toEqual(["Continúa «A»."]);
    expect(log.notes).toBe("");
    expect(log.descriptions).toEqual({});
  });
});
