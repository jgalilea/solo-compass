/**
 * Everything that leaves the device for the sync relay is sealed here:
 * compressed, then encrypted with AES-256-GCM under a key derived from
 * the sync code (syncCode.ts), which never leaves the player's devices.
 * The relay sees only sizes. From the same code, HKDF-SHA-256 also
 * gives the box's id (what the relay files it under) and its pass (what
 * the relay asks for on every request; it keeps only its hash), so
 * knowing a box's id, from a log say, is no way in.
 *
 * GCM also authenticates: a relay that changed a byte, or swapped a
 * change for a snapshot (the kind is bound to it), would be caught, not
 * believed. Sealed bytes: a format byte, the 12-byte IV, the ciphertext.
 */

export interface SyncKeys {
  box: string;
  pass: string;
  key: CryptoKey;
}

export type SealedKind = "op" | "snapshot";

const FORMAT = 1;
const encoder = new TextEncoder();
const SALT = encoder.encode("solo-compass-sync-v1");

export class SyncDataError extends Error {}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function deriveKeys(secret: Uint8Array<ArrayBuffer>): Promise<SyncKeys> {
  const base = await crypto.subtle.importKey("raw", secret, "HKDF", false, [
    "deriveBits",
    "deriveKey",
  ]);
  const params = (info: string): HkdfParams => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: SALT,
    info: encoder.encode(info),
  });
  const [box, pass, key] = await Promise.all([
    crypto.subtle.deriveBits(params("box"), base, 128),
    crypto.subtle.deriveBits(params("pass"), base, 256),
    crypto.subtle.deriveKey(params("data"), base, { name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]),
  ]);
  return { box: hex(box), pass: base64url(pass), key };
}

async function through(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const piped = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

function boundTo(keys: SyncKeys, kind: SealedKind): Uint8Array<ArrayBuffer> {
  return encoder.encode(`${keys.box}:${kind}`);
}

export async function seal(
  keys: SyncKeys,
  kind: SealedKind,
  value: unknown,
): Promise<Uint8Array<ArrayBuffer>> {
  const packed = await through(
    encoder.encode(JSON.stringify(value)),
    new CompressionStream("gzip"),
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: boundTo(keys, kind) },
    keys.key,
    packed,
  );
  const sealed = new Uint8Array(1 + iv.length + cipher.byteLength);
  sealed[0] = FORMAT;
  sealed.set(iv, 1);
  sealed.set(new Uint8Array(cipher), 1 + iv.length);
  return sealed;
}

export async function unseal(
  keys: SyncKeys,
  kind: SealedKind,
  sealed: Uint8Array,
): Promise<unknown> {
  if (sealed.length < 1 + 12 + 16 || sealed[0] !== FORMAT)
    throw new SyncDataError("unknown format");
  const copy = new Uint8Array(sealed);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: copy.subarray(1, 13), additionalData: boundTo(keys, kind) },
      keys.key,
      copy.subarray(13),
    );
  } catch {
    throw new SyncDataError("can't be opened with this code");
  }
  try {
    const json = await through(new Uint8Array(plain), new DecompressionStream("gzip"));
    return JSON.parse(new TextDecoder().decode(json));
  } catch {
    throw new SyncDataError("damaged");
  }
}
