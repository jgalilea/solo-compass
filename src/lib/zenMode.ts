/**
 * Zen mode: an adventure's journal as a story, without the dice. Only
 * what's told stays (sessions and scenes, actions, consequences, notes,
 * dialogue, in-world text); the questions to the oracle, every roll,
 * the asides about the game ("(note: …)"), the add-ons' block markers
 * and rounds, and the notes that are nothing but tags (a clock's step,
 * a new NPC from the notebook) are left out. A view, never stored:
 * nothing changes in the journal or its export.
 */

import type { JournalEntry } from "./lonelog";
import { noteForm } from "./lonelogLines";
import { splitTags } from "./lonelogTags";

/** Whether an entry is part of the story told, for zen mode. */
export function isStoryEntry(entry: JournalEntry): boolean {
  switch (entry.kind) {
    case "question":
    case "roll":
      return false;
    case "note": {
      const form = noteForm(entry.text).form;
      if (form === "meta" || form === "block" || form === "round") return false;
      // Only tags (and spaces): the notebook's bookkeeping, not prose.
      return !splitTags(entry.text).every((part) => part.tag || !part.text.trim());
    }
    default:
      return true;
  }
}
