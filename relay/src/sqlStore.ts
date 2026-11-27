import type { BoxMeta, BoxStore } from "./box.ts";

/**
 * The snapshot goes in parts of this size, under a row's 2 MB limit:
 * the bigger they are, the fewer rows a fold writes.
 */
const PART_BYTES = Math.floor(1.8 * 1024 * 1024);

const CREATE_CHANGES =
  "CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY, at INTEGER NOT NULL, data BLOB NOT NULL)";
const CREATE_SNAPSHOT =
  "CREATE TABLE IF NOT EXISTS snapshot (part INTEGER PRIMARY KEY, data BLOB NOT NULL)";

function toBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

/**
 * A box in its Durable Object's own SQLite database. Every key is the
 * table's rowid (INTEGER PRIMARY KEY), so there's no index to keep up:
 * an index's update counts as a row written too.
 */
export class SqlBoxStore implements BoxStore {
  private sql: SqlStorage;

  constructor(sql: SqlStorage) {
    this.sql = sql;
    this.init();
  }

  /** Again after an expiry, which deletes the tables too. */
  init(): void {
    this.sql.exec("CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY, json TEXT NOT NULL)");
    this.sql.exec(CREATE_CHANGES);
    this.sql.exec(CREATE_SNAPSHOT);
  }

  meta(): BoxMeta | null {
    const row = this.sql.exec<{ json: string }>("SELECT json FROM meta WHERE id = 1").toArray()[0];
    return row ? (JSON.parse(row.json) as BoxMeta) : null;
  }

  setMeta(meta: BoxMeta): void {
    this.sql.exec(
      "INSERT INTO meta (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json",
      JSON.stringify(meta),
    );
  }

  appendChange(seq: number, at: number, data: Uint8Array): void {
    this.sql.exec("INSERT INTO changes (seq, at, data) VALUES (?, ?, ?)", seq, at, toBuffer(data));
  }

  lastChange(): number | null {
    // The rowid's maximum: one row read.
    return this.sql.exec<{ seq: number | null }>("SELECT MAX(seq) AS seq FROM changes").one().seq;
  }

  changesAfter(seq: number): { seq: number; data: Uint8Array }[] {
    return this.sql
      .exec<{ seq: number; data: ArrayBuffer }>(
        "SELECT seq, data FROM changes WHERE seq > ? ORDER BY seq",
        seq,
      )
      .toArray()
      .map((row) => ({ seq: row.seq, data: new Uint8Array(row.data) }));
  }

  changeStatsAfter(seq: number): { count: number; bytes: number } {
    const row = this.sql
      .exec<{ count: number; bytes: number | null }>(
        "SELECT COUNT(*) AS count, SUM(length(data)) AS bytes FROM changes WHERE seq > ?",
        seq,
      )
      .one();
    return { count: row.count, bytes: row.bytes ?? 0 };
  }

  recentChangeTimes(count: number): number[] {
    return this.sql
      .exec<{ at: number }>("SELECT at FROM changes ORDER BY seq DESC LIMIT ?", count)
      .toArray()
      .map((row) => row.at);
  }

  /**
   * Usually every change is folded: then the table goes and comes back
   * (measured: dropping writes no row, making it two), instead of one row
   * written per change deleted, which made folding cost as much as
   * sending.
   */
  deleteChangesUpTo(seq: number): void {
    const last = this.lastChange();
    if (last === null) return;
    if (last > seq) {
      this.sql.exec("DELETE FROM changes WHERE seq <= ?", seq);
      return;
    }
    this.sql.exec("DROP TABLE changes");
    this.sql.exec(CREATE_CHANGES);
  }

  snapshot(): Uint8Array | null {
    const parts = this.sql
      .exec<{ data: ArrayBuffer }>("SELECT data FROM snapshot ORDER BY part")
      .toArray()
      .map((row) => new Uint8Array(row.data));
    if (parts.length === 0) return null;
    const whole = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
    let at = 0;
    for (const part of parts) {
      whole.set(part, at);
      at += part.length;
    }
    return whole;
  }

  /** Part by part over the old one (a row each), then whatever parts it had beyond. */
  setSnapshot(data: Uint8Array): void {
    let part = 0;
    for (let at = 0; at < data.length; at += PART_BYTES, part++) {
      this.sql.exec(
        "INSERT INTO snapshot (part, data) VALUES (?, ?) ON CONFLICT(part) DO UPDATE SET data = excluded.data",
        part,
        toBuffer(data.subarray(at, at + PART_BYTES)),
      );
    }
    this.sql.exec("DELETE FROM snapshot WHERE part >= ?", part);
  }

  wipe(): void {
    this.sql.exec("DROP TABLE changes");
    this.sql.exec("DROP TABLE snapshot");
    this.sql.exec("DELETE FROM meta");
    this.init();
  }
}
