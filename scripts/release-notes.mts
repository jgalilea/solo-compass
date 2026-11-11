// Prints a version's GitHub release notes: its changelog chapter in
// Spanish and English. Usage: node scripts/release-notes.mts 1.0.0
import { CHANGELOG } from "../src/lib/changelog.ts";

const version = process.argv[2];
const entry = CHANGELOG.find((e) => e.version === version);
if (!entry) {
  console.error(`No changelog chapter for version ${version}`);
  process.exit(1);
}

const section = ({ title, intro, items }: (typeof entry.text)["es"]) =>
  [`## ${title}`, ...(intro ? ["", `*${intro}*`] : []), "", ...items.map((item) => `- ${item}`)].join("\n");

console.log([section(entry.text.es), section(entry.text.en)].join("\n\n---\n\n"));
