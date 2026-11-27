import type { BoxMeta, BoxStore } from "./box.ts";

/**
 * A box kept in memory: for the tests and the app's e2e (a fake relay).
 * It counts the rows the SQLite one would write (`rowsWritten`), a
 * daily allowance on the free plan, so the tests keep it low.
 */
export class MemoryBoxStore implements BoxStore {
  private stored: BoxMeta | null = null;
  private changes = new Map<number, { at: number; data: Uint8Array }>();
  private snap: Uint8Array | null = null;
  rowsWritten = 0;

  meta(): BoxMeta | null {
    return this.stored && structuredClone(this.stored);
  }
  setMeta(meta: BoxMeta): void {
    this.stored = structuredClone(meta);
    this.rowsWritten++;
  }
  appendChange(seq: number, at: number, data: Uint8Array): void {
    this.changes.set(seq, { at, data: data.slice() });
    this.rowsWritten++;
  }
  lastChange(): number | null {
    return this.changes.size ? Math.max(...this.changes.keys()) : null;
  }
  changesAfter(seq: number): { seq: number; data: Uint8Array }[] {
    return [...this.changes]
      .filter(([s]) => s > seq)
      .sort(([a], [b]) => a - b)
      .map(([s, { data }]) => ({ seq: s, data }));
  }
  changeStatsAfter(seq: number): { count: number; bytes: number } {
    const after = this.changesAfter(seq);
    return { count: after.length, bytes: after.reduce((sum, o) => sum + o.data.length, 0) };
  }
  recentChangeTimes(count: number): number[] {
    return [...this.changes]
      .sort(([a], [b]) => b - a)
      .slice(0, count)
      .map(([, { at }]) => at);
  }
  deleteChangesUpTo(seq: number): void {
    for (const s of [...this.changes.keys()]) {
      if (s > seq) continue;
      this.changes.delete(s);
      this.rowsWritten++;
    }
  }
  snapshot(): Uint8Array | null {
    return this.snap;
  }
  setSnapshot(data: Uint8Array): void {
    this.snap = data.slice();
    // As SQLite keeps it: one row per part (see sqlStore.ts).
    this.rowsWritten += Math.max(1, Math.ceil(data.length / Math.floor(1.8 * 1024 * 1024)));
  }
  wipe(): void {
    this.rowsWritten += this.changes.size + (this.snap ? 1 : 0) + (this.stored ? 1 : 0);
    this.stored = null;
    this.changes.clear();
    this.snap = null;
  }
}
