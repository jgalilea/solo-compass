import type { ComponentType } from "react";
import type { CastKind } from "../lib/lonelogTags";
import { IconNpc, IconPc, IconPlace } from "./icons/Icons";

const CAST_ICON: Record<CastKind, ComponentType<{ size?: number; className?: string }>> = {
  pc: IconPc,
  npc: IconNpc,
  place: IconPlace,
};

/** The icon of a character (PC or NPC) or place. */
export function CastIcon({ kind, size, className }: { kind: CastKind; size?: number; className?: string }) {
  const Icon = CAST_ICON[kind];
  return <Icon size={size} className={className} />;
}
