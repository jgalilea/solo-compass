// Run by `npm install` (the "prepare" script) in every clone: points
// git blame at .git-blame-ignore-revs, so formatting-only commits don't
// show up as the author of the lines they reformatted. A git setting
// lives in each clone's .git, never in a commit, hence this.
import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["config", "blame.ignoreRevsFile", ".git-blame-ignore-revs"], {
    stdio: "ignore",
  });
} catch {
  // Not a git checkout (a tarball) or no git at all: nothing to set.
}
