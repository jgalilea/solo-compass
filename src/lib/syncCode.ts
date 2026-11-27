/**
 * The sync code: 16 random bytes that are the whole of a player's sync
 * (syncCrypto.ts derives the box, its pass and the key from them).
 * Shown in Crockford's base32 (no I, L, O or U, so nothing reads as
 * something else) in groups of four, with a check character at the end,
 * so a typo is caught before linking instead of making a new empty box
 * under the wrong code: any one character wrong, or two side by side
 * swapped, always is (`checkSymbol`).
 *
 *   K7QM-2XRA-9FJD-…-0BT
 *
 * Typed back, case, spaces and dashes don't matter, and O/I/L are read
 * as 0/1/1.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SECRET_BYTES = 16;
/** 128 bits in base32: 26 characters (the last two bits are always 0). */
const BODY_LENGTH = 26;

export function newSecret(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
}

/** x times a symbol, in GF(32) (polynomial x⁵ + x² + 1). */
function times2(v: number): number {
  return v & 16 ? (v << 1) ^ 0b100101 : v << 1;
}

/**
 * The check symbol: the symbols weighted by powers of 2 and added up in
 * GF(32), a field, so every weight and every difference between two
 * neighbours' weights has an inverse; that's what catches every single
 * wrong symbol and every swap of neighbours (the check symbol's
 * included). Luhn mod 32 missed swapping 0 and Z: 32 isn't prime.
 */
function checkSymbol(values: number[]): number {
  let sum = 0;
  for (const v of values) sum = times2(sum) ^ v;
  return times2(sum);
}

function toSymbols(secret: Uint8Array): number[] {
  const symbols: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const byte of secret) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      symbols.push((buffer >> (bits - 5)) & 31);
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) symbols.push((buffer << (5 - bits)) & 31);
  return symbols;
}

/** The code as shown: groups of four, the check character last. */
export function formatCode(secret: Uint8Array): string {
  const symbols = toSymbols(secret);
  const text = [...symbols, checkSymbol(symbols)].map((v) => ALPHABET[v]).join("");
  return text.match(/.{1,4}/g)!.join("-");
}

/** The code without dashes, for a link. */
export function compactCode(code: string): string {
  return code.replace(/-/g, "");
}

/** Typed or pasted: the secret, or null if it isn't a valid code. */
export function parseCode(text: string): Uint8Array<ArrayBuffer> | null {
  const cleaned = text
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (cleaned.length !== BODY_LENGTH + 1) return null;
  const values = Array.from(cleaned, (c) => ALPHABET.indexOf(c));
  if (values.some((v) => v < 0)) return null;
  const body = values.slice(0, BODY_LENGTH);
  if (checkSymbol(body) !== values[BODY_LENGTH]) return null;
  // The last symbol carries three bits: its other two are always zero.
  if (body[BODY_LENGTH - 1]! & 0b11) return null;
  const secret = new Uint8Array(SECRET_BYTES);
  let buffer = 0;
  let bits = 0;
  let at = 0;
  for (const value of body) {
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8 && at < SECRET_BYTES) {
      secret[at++] = (buffer >> (bits - 8)) & 0xff;
      bits -= 8;
      buffer &= (1 << bits) - 1;
    }
  }
  return secret;
}
