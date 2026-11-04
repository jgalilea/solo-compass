/**
 * Lower-case and without accents (via Unicode decomposition), so
 * searching "accion" finds "Acción" and vice versa.
 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Every word of the query appears in the text (any order, accents ignored). */
export function matchesAllWords(text: string, query: string): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const haystack = normalizeForSearch(text);
  return words.every((w) => haystack.includes(w));
}

/**
 * Splits a text into the parts that match a word of the query and the
 * rest, to highlight them. Works on the original text (keeps its
 * accents and case): NFD normalisation can change the length, so the
 * comparison is done character by character.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [{ text, match: false }];
  const chars = [...text];
  const folded = chars.map((c) => normalizeForSearch(c));
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const word of words) {
    for (let start = 0; start < chars.length; start++) {
      let i = start;
      let built = "";
      while (i < chars.length && built.length < word.length) built += folded[i++];
      if (built === word) for (let k = start; k < i; k++) marked[k] = true;
    }
  }
  const parts: { text: string; match: boolean }[] = [];
  chars.forEach((c, i) => {
    const last = parts.at(-1);
    if (last && last.match === marked[i]) last.text += c;
    else parts.push({ text: c, match: marked[i] });
  });
  return parts;
}
