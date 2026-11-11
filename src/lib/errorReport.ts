import { versionLabel } from "./appVersion";
import { GITHUB_URL } from "./support";

/** Stack lines kept: enough to find the spot, short enough for an issue's URL. */
const STACK_LINES = 8;

/**
 * What the error screen copies, to paste when reporting it: the app's
 * version, where it happened, the browser and the error itself. Never
 * anything from the journal.
 */
export function errorReport(
  error: Error,
  where: { screen: string; userAgent: string; date: Date } = {
    screen: window.location.hash || "#/",
    userAgent: navigator.userAgent,
    date: new Date(),
  },
): string {
  const stack = (error.stack ?? "").split("\n").slice(1, STACK_LINES + 1).map((line) => line.trim());
  return [
    `Solo Compass ${versionLabel()}`,
    `${where.date.toISOString()} · ${where.screen}`,
    where.userAgent,
    "",
    `${error.name}: ${error.message}`,
    ...stack,
  ].join("\n");
}

/**
 * A new GitHub issue with the report already in it. Only title and
 * body: a parameter like "labels" needs rights on the repository, and
 * without them GitHub answers 404.
 */
export function errorIssueUrl(error: Error, report: string): string {
  const title = `Error: ${error.message}`.slice(0, 100);
  const body = "```\n" + report + "\n```\n";
  return `${GITHUB_URL}/issues/new?${new URLSearchParams({ title, body })}`;
}
