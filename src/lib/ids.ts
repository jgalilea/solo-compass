/**
 * A new unique id for anything the app stores (entries, adventures,
 * rolls, tables): a UUID where the browser has one, else time plus
 * randomness. `prefix` marks the kind where it matters (the player's
 * tables are "custom-…", so they never clash with a built-in table id).
 */
export function makeId(prefix = ""): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}${crypto.randomUUID()}`;
  }
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
