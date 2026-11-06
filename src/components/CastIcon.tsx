import type { ComponentType } from "react";
import type { CastKind } from "../lib/lonelogTags";
import { IconClock, IconNpc, IconPc, IconPlace, IconThread, IconTimer, IconTrack } from "./icons/Icons";

const CAST_ICON: Record<CastKind, ComponentType<{ size?: number; className?: string }>> = {
  pc: IconPc,
  npc: IconNpc,
  place: IconPlace,
  thread: IconThread,
  clock: IconClock,
  track: IconTrack,
  timer: IconTimer,
};

/** The icon of a notebook element: character, place, thread, clock… */
export function CastIcon({ kind, size, className }: { kind: CastKind; size?: number; className?: string }) {
  const Icon = CAST_ICON[kind];
  return <Icon size={size} className={className} />;
}
