/**
 * Credits for the third-party tables, as each source asks for them:
 * shown in Settings → About (and in the README). Apart from the games'
 * index (tableGames.ts), which the first screen loads: only Settings
 * reads these.
 */

import { IRONSWORN_URL, STARSMITH_URL, IRONSMITH_URL, LONER_URL, KNAVE_URL, CAIRN_URL, LAZY_GM_URL, OPSE_URL } from "./tableGames";

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";
const CC_BY_SA = "https://creativecommons.org/licenses/by-sa/4.0/";

/**
 * Credits for the third-party tables (Settings → About). `attribution`
 * is the wording each source asks for, in English as published.
 */
export const TABLE_CREDITS: {
  name: string;
  author: string;
  license: string;
  licenseUrl: string;
  url: string;
  attribution: string[];
}[] = [
  {
    name: "Ironsworn · Delve · Starforged",
    author: "Shawn Tomkin",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: IRONSWORN_URL,
    attribution: [
      "This work is based on Ironsworn, Ironsworn: Delve and Ironsworn: Starforged, created by Shawn Tomkin, and licensed for our use under the Creative Commons Attribution 4.0 International License.",
    ],
  },
  {
    name: "Starsmith: Expanded Oracles",
    author: "Eric Bright",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: STARSMITH_URL,
    attribution: ["Starsmith: Expanded Oracles by Eric Bright, licensed under the Creative Commons Attribution 4.0 International License."],
  },
  {
    name: "Ironsmith",
    author: "Eric Bright",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: IRONSMITH_URL,
    attribution: ["Ironsmith by Eric Bright, licensed under the Creative Commons Attribution 4.0 International License."],
  },
  {
    name: "Loner",
    author: "Roberto Bisceglie",
    license: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA,
    url: LONER_URL,
    attribution: ["Loner v2.3 (CC) 2023 Roberto Bisceglie, licensed under the Creative Commons Attribution-ShareAlike 4.0 International License."],
  },
  {
    name: "Knave",
    author: "Ben Milton",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: KNAVE_URL,
    attribution: ["Knave by Ben Milton, licensed under the Creative Commons Attribution 4.0 International License."],
  },
  {
    name: "Cairn",
    author: "Yochai Gal",
    license: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA,
    url: CAIRN_URL,
    attribution: ["Cairn by Yochai Gal, licensed under the Creative Commons Attribution-ShareAlike 4.0 International License."],
  },
  {
    name: "Lazy GM's Resource Document",
    author: "Michael E. Shea",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: LAZY_GM_URL,
    attribution: [
      "This work includes material taken from the Lazy GM's Resource Document by Michael E. Shea of SlyFlourish.com, available under the Creative Commons Attribution 4.0 International License.",
      "This work includes material taken from the System Reference Document 5.1 (\"SRD 5.1\") by Wizards of the Coast LLC. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License.",
    ],
  },
  {
    name: "One Page Solo Engine",
    author: "Karl Hendricks (Inflatable Studios)",
    license: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA,
    url: OPSE_URL,
    attribution: ["One Page Solo Engine v1.6 by Karl Hendricks (Inflatable Studios), licensed under CC BY-SA 4.0."],
  },
];
