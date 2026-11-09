import type { ComponentType } from "react";
import type { CastKind } from "../lib/lonelogTags";
import {
  IconClock,
  IconFoe,
  IconInventory,
  IconNpc,
  IconPc,
  IconPlace,
  IconRoom,
  IconThread,
  IconTimer,
  IconTrack,
  IconWealth,
} from "./icons/Icons";

const CAST_ICON: Record<CastKind, ComponentType<{ size?: number; className?: string }>> = {
  pc: IconPc,
  npc: IconNpc,
  place: IconPlace,
  thread: IconThread,
  clock: IconClock,
  track: IconTrack,
  timer: IconTimer,
  room: IconRoom,
  foe: IconFoe,
  item: IconInventory,
  wealth: IconWealth,
};

/** The icon of a notebook element: character, place, thread, clock… */
export function CastIcon({ kind, size, className }: { kind: CastKind; size?: number; className?: string }) {
  const Icon = CAST_ICON[kind];
  return <Icon size={size} className={className} />;
}
