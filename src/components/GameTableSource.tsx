import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { IconHistory, IconJournal, IconStar } from "./icons/Icons";

/** Which of an adventure's game table tools. */
export type GameTool = "oracle" | "dice" | "tables";

/**
 * Where what's on it comes from: the favourites (the stars on the
 * Oracle, Dice and Tables screens), the device's last oracle (no
 * favourite oracle yet) or the adventure's own pick.
 */
export type TableSource = "favorite" | "last" | "adventure";

const ICON = { favorite: IconStar, last: IconHistory, adventure: IconJournal };

function useSourceLabel(tool: GameTool, source: TableSource, onOracleScreen: boolean): string {
  const g = useLocaleContext().t.gameTable;
  if (source === "adventure") return onOracleScreen ? g.fromActiveAdventure : g.fromAdventure;
  if (source === "last") return g.fromLastOracle;
  return tool === "dice" ? g.fromFavoriteDice : tool === "tables" ? g.fromFavoriteTables : g.fromFavoriteOracle;
}

/**
 * Beside each tool of an adventure's game table (and the Oracle screen's
 * switcher while an adventure is active): whether what's there are the
 * favourites or the adventure's own, so the rule never has to be guessed.
 */
export function SourceTag({
  tool,
  source,
  onOracleScreen = false,
  className = "",
}: {
  tool: GameTool;
  source: TableSource;
  onOracleScreen?: boolean;
  className?: string;
}) {
  const label = useSourceLabel(tool, source, onOracleScreen);
  const Icon = ICON[source];
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 text-xs text-parchment-faint ${className}`}>
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * On top of the oracle's, the dice's and the tables' dialogs, the same
 * three lines: where it comes from now, the rule (what's picked here is
 * this adventure's alone) and what that means from here on.
 */
export function SourceNote({
  tool,
  source,
  name,
  onOracleScreen = false,
}: {
  tool: GameTool;
  source: TableSource;
  name: string;
  onOracleScreen?: boolean;
}) {
  const g = useLocaleContext().t.gameTable;
  const label = useSourceLabel(tool, source, onOracleScreen);
  const Icon = ICON[source];
  const rule =
    tool === "dice" ? g.diceRule : tool === "tables" ? g.tablesRule : onOracleScreen ? g.oracleScreenRule : g.oracleRule;
  const now = {
    dice: source === "adventure" ? g.diceOwn : g.diceFollowing,
    tables: source === "adventure" ? g.tablesOwn : g.tablesFollowing,
    oracle: source === "adventure" ? g.oracleOwn : source === "last" ? g.oracleFollowingLast : g.oracleFollowing,
  }[tool];
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-ink-border bg-ink-900/40 px-3.5 py-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-gold">
        <Icon size={15} className="shrink-0" />
        {label}
      </p>
      <p className="text-parchment">{interpolate(rule, { name })}</p>
      <p className="text-parchment-dim">{now}</p>
    </div>
  );
}
