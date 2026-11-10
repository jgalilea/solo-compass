/**
 * Lonelog's dice notation add-on, the whole grammar: rolls a formula
 * and writes it as a Lonelog roll, die by die, or returns null if it
 * can't be read.
 *
 *   2d6+3, 1d8+1d6-2      dice and numbers added up: "2d6+3 -> 9 (4+2 + 3)"
 *   d%, 4dF, 4dF.1        d100, Fudge dice (standard, or four blanks)
 *   min3, max3            a die below/above it counts as it (3↑, 3↓)
 *   !, !!, !p, !>4        exploding (each reroll one more die, "6!"),
 *                         compounding (onto the same die, "6!+6!+2"),
 *                         penetrating (rerolls count one less) and the
 *                         condition that makes them explode
 *   r, ro, r<3            reroll until it misses the condition (or once):
 *                         "1→4"
 *   u, uo                 reroll repeated results
 *   kh3, kl1, k3          keep the highest/lowest N (the rest get ✗)
 *   dl1, dh1, d1          drop the lowest/highest N
 *   >=5, f<3              count successes (✓) instead of adding, and take
 *                         one away for each failure (✗)
 *   cs, cf, cs>18         mark critical successes/failures (▲, ▼)
 *   s, sa, sd             sort the dice as written
 *   * / % ^ ( )           arithmetic, also for how many dice or faces:
 *                         (4-2)d10, 3d(2*6)
 *   {4d6, 2d10}k1         groups: added up, or kept, dropped or counted
 *                         by each part's total
 *   // Strength, # …,     a description, written before the roll
 *   [ … ], /* … *\/
 *
 * Modifiers act in the spec's fixed order, whatever order they're
 * written in. A condition right after a modifier that takes one is
 * that modifier's: 3d10!>=8 explodes on 8 or more; 3d10>=8! counts
 * 8+ and explodes on 10.
 *
 * A single die with nothing else is just "d20 -> 14", like the buttons.
 */

/** Dice per term (the spec's limit). */
export const MAX_DICE = 999;
/** Rerolls a single die may chain (exploding, rerolling), as in the spec. */
const MAX_ITERATIONS = 1000;
/** Every die a whole formula may roll, so a typo can't freeze the app. */
const MAX_ROLLS = 10_000;

type Compare = { op: string; n: number };

const COMPARE = /^(>=|<=|<>|!=|=|>|<)(-?\d+)/;

function meets(c: Compare, v: number): boolean {
  switch (c.op) {
    case "=":
      return v === c.n;
    case "!=":
    case "<>":
      return v !== c.n;
    case "<":
      return v < c.n;
    case ">":
      return v > c.n;
    case "<=":
      return v <= c.n;
    default:
      return v >= c.n;
  }
}

/** One roll of a die, and what happened to it ("6!", "3↑"). */
type Face = { v: number; mark: string };

/**
 * One die as it ends up: its faces (more than one when it compounded),
 * what it was rerolled from, and how it counts.
 */
type Die = {
  faces: Face[];
  rerolled: number[];
  dropped: boolean;
  success: boolean;
  failure: boolean;
  crit: "" | "▲" | "▼";
};

const total = (die: Die) => die.faces.reduce((sum, f) => sum + f.v, 0);

type Pool = { target: Compare | null; failure: Compare | null };

type Node =
  | { kind: "num"; value: number }
  | { kind: "neg"; inner: Node }
  | { kind: "paren"; inner: Node }
  | { kind: "bin"; op: "+" | "-" | "*" | "/" | "%" | "^"; left: Node; right: Node }
  | ({ kind: "dice"; fudge: boolean; compound: boolean; dice: Die[]; shown: Die[] } & Pool)
  | ({
      kind: "group";
      subs: Node[];
      /** Per part: dropped, a success, a failure. */
      out: boolean[];
      hit: boolean[];
      miss: boolean[];
      order: number[];
    } & Pool);

class Unreadable extends Error {}

function fail(): never {
  throw new Unreadable();
}

function value(node: Node): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "neg":
      return -value(node.inner);
    case "paren":
      return value(node.inner);
    case "bin": {
      const a = value(node.left);
      const b = value(node.right);
      if (node.op === "+") return a + b;
      if (node.op === "-") return a - b;
      if (node.op === "*") return a * b;
      if (node.op === "/") return a / b;
      if (node.op === "%") return a % b;
      return a ** b;
    }
    case "dice": {
      const kept = node.dice.filter((d) => !d.dropped);
      if (node.target) return kept.filter((d) => d.success).length - kept.filter((d) => d.failure).length;
      return kept.reduce((sum, d) => sum + total(d), 0);
    }
    case "group": {
      const kept = node.subs.filter((_, i) => !node.out[i]);
      if (node.target) return node.hit.filter(Boolean).length - node.miss.filter(Boolean).length;
      return kept.reduce((sum, sub) => sum + value(sub), 0);
    }
  }
}

/** Every die rolled inside a node (for a group of one keeping dice). */
function diceIn(node: Node): Die[] {
  switch (node.kind) {
    case "num":
      return [];
    case "neg":
    case "paren":
      return diceIn(node.inner);
    case "bin":
      return [...diceIn(node.left), ...diceIn(node.right)];
    case "dice":
      return node.dice;
    case "group":
      return node.subs.flatMap(diceIn);
  }
}

type KeepDrop = { keep: boolean; highest: boolean; n: number };

/**
 * Keeping and dropping look at the whole pool, already dropped dice
 * included (spec: "3d10k1dh1" drops everything).
 */
function applyKeepDrop<T>(items: T[], score: (item: T) => number, rules: KeepDrop[], dropped: (item: T) => void) {
  for (const { keep, highest, n } of rules) {
    const byScore = items.map((item, i) => ({ item, i })).sort((a, b) => score(a.item) - score(b.item) || a.i - b.i);
    if (highest) byScore.reverse();
    // Keeping N highest is dropping the rest from the low end.
    const out = keep ? byScore.slice(n) : byScore.slice(0, n);
    for (const { item } of out) dropped(item);
  }
}

class Parser {
  private i = 0;
  private rolls = 0;
  private readonly s: string;
  private readonly random: () => number;

  constructor(s: string, random: () => number) {
    this.s = s;
    this.random = random;
  }

  parse(): Node {
    const node = this.expr();
    if (this.i !== this.s.length) fail();
    return node;
  }

  private peek(text: string): boolean {
    return this.s.startsWith(text, this.i);
  }

  private eat(text: string): boolean {
    if (!this.peek(text)) return false;
    this.i += text.length;
    return true;
  }

  private match(re: RegExp): RegExpMatchArray | null {
    const m = this.s.slice(this.i).match(re);
    if (m) this.i += m[0].length;
    return m;
  }

  private int(): number {
    const m = this.match(/^\d+/);
    if (!m) fail();
    return Number(m[0]);
  }

  private compare(): Compare | null {
    const m = this.match(COMPARE);
    return m ? { op: m[1], n: Number(m[2]) } : null;
  }

  private expr(): Node {
    let node = this.term();
    for (;;) {
      const op = this.peek("+") ? "+" : this.peek("-") ? "-" : null;
      if (!op) return node;
      this.i++;
      node = { kind: "bin", op, left: node, right: this.term() };
    }
  }

  private term(): Node {
    let node = this.power();
    for (;;) {
      const op = this.peek("**") ? null : this.peek("*") ? "*" : this.peek("/") ? "/" : this.peek("%") ? "%" : null;
      if (!op) return node;
      this.i++;
      node = { kind: "bin", op, left: node, right: this.power() };
    }
  }

  private power(): Node {
    const base = this.unary();
    if (this.eat("^") || this.eat("**")) return { kind: "bin", op: "^", left: base, right: this.power() };
    return base;
  }

  private unary(): Node {
    if (this.eat("-")) return { kind: "neg", inner: this.unary() };
    if (this.eat("+")) return this.unary();
    return this.primary();
  }

  private primary(): Node {
    if (this.peek("{")) return this.group();
    if (this.eat("(")) {
      const inner = this.expr();
      if (!this.eat(")")) fail();
      const paren: Node = { kind: "paren", inner };
      return this.startsDice() ? this.dice(paren) : paren;
    }
    if (this.peek("d")) return this.dice(null);
    const m = this.match(/^\d+(?:\.\d+)?/);
    if (!m) fail();
    const num: Node = { kind: "num", value: Number(m[0]) };
    return this.startsDice() ? this.dice(num) : num;
  }

  /** "d" followed by faces: a die, not a "drop" or a stray letter. */
  private startsDice(): boolean {
    return /^d(?:\d|%|f|\()/.test(this.s.slice(this.i));
  }

  private group(): Node {
    this.eat("{");
    const subs = [this.expr()];
    while (this.eat(",")) subs.push(this.expr());
    if (!this.eat("}")) fail();
    const keepDrop: KeepDrop[] = [];
    let target: Compare | null = null;
    let failure: Compare | null = null;
    let sort: "asc" | "desc" | null = null;
    for (;;) {
      const kd = this.keepDrop();
      if (kd) keepDrop.push(kd);
      else if (this.peek("f") && target) {
        this.i++;
        failure = this.compare() ?? fail();
      } else if (this.peek("s")) sort = this.sort();
      else if (!target && (target = this.compare())) continue;
      else break;
    }
    const node: Node = {
      kind: "group",
      subs,
      out: subs.map(() => false),
      hit: subs.map(() => false),
      miss: subs.map(() => false),
      order: subs.map((_, i) => i),
      target,
      failure,
    };
    if (subs.length === 1) {
      // A group of one keeps or drops single dice, across all of it.
      applyKeepDrop(diceIn(subs[0]).filter((d) => !d.dropped), total, keepDrop, (d) => (d.dropped = true));
    } else {
      applyKeepDrop(node.order, (i) => value(subs[i]), keepDrop, (i) => (node.out[i] = true));
    }
    if (target) {
      subs.forEach((sub, i) => {
        if (node.out[i]) return;
        node.hit[i] = meets(target, value(sub));
        node.miss[i] = !node.hit[i] && !!failure && meets(failure, value(sub));
      });
    }
    if (sort) node.order.sort((a, b) => (sort === "asc" ? 1 : -1) * (value(subs[a]) - value(subs[b])));
    return node;
  }

  private keepDrop(): KeepDrop | null {
    const m = this.match(/^([kd])([hl]?)(\d+)/);
    if (!m) return null;
    const keep = m[1] === "k";
    // "k" alone keeps the highest, "d" alone drops the lowest.
    const highest = m[2] ? m[2] === "h" : keep;
    return { keep, highest, n: Number(m[3]) };
  }

  private sort(): "asc" | "desc" {
    this.eat("s");
    if (this.eat("d")) return "desc";
    this.eat("a");
    return "asc";
  }

  private count(node: Node | null): number {
    const n = node ? value(node) : 1;
    if (!Number.isInteger(n) || n < 1 || n > MAX_DICE) fail();
    return n;
  }

  private dice(countNode: Node | null): Node {
    const count = this.count(countNode);
    this.eat("d");
    let fudge: false | 1 | 2 = false;
    let sides = 0;
    if (this.eat("%")) sides = 100;
    else if (this.eat("f")) fudge = this.eat(".1") ? 1 : (this.eat(".2"), 2);
    else if (this.eat("(")) {
      const inner = this.expr();
      if (!this.eat(")")) fail();
      sides = value(inner);
    } else sides = this.int();
    if (!fudge && (!Number.isInteger(sides) || sides < 1 || sides > Number.MAX_SAFE_INTEGER)) fail();
    const low = fudge ? -1 : 1;
    const high = fudge ? 1 : sides;

    // The modifiers, in any order (each at most once, drops aside).
    let min: number | null = null;
    let max: number | null = null;
    let explode: { compound: boolean; penetrate: boolean; when: Compare } | null = null;
    let reroll: { once: boolean; when: Compare } | null = null;
    let unique: { once: boolean; when: Compare | null } | null = null;
    const keepDrop: KeepDrop[] = [];
    let target: Compare | null = null;
    let failure: Compare | null = null;
    let critSuccess: Compare | null = null;
    let critFailure: Compare | null = null;
    let sort: "asc" | "desc" | null = null;
    for (;;) {
      if (this.peek("min") && min === null) {
        this.i += 3;
        min = this.int();
      } else if (this.peek("max") && max === null) {
        this.i += 3;
        max = this.int();
      } else if (this.peek("!") && !explode) {
        this.i++;
        const compound = this.eat("!");
        const penetrate = this.eat("p");
        explode = { compound, penetrate, when: this.compare() ?? { op: "=", n: high } };
      } else if (this.peek("r") && !reroll) {
        this.i++;
        const once = this.eat("o");
        reroll = { once, when: this.compare() ?? { op: "=", n: low } };
      } else if (this.peek("u") && !unique) {
        this.i++;
        const once = this.eat("o");
        unique = { once, when: this.compare() };
      } else if (this.peek("cs") && !critSuccess) {
        this.i += 2;
        critSuccess = this.compare() ?? { op: "=", n: high };
      } else if (this.peek("cf") && !critFailure) {
        this.i += 2;
        critFailure = this.compare() ?? { op: "=", n: low };
      } else if (this.peek("f") && target && !failure) {
        this.i++;
        failure = this.compare() ?? fail();
      } else if (this.peek("s") && !sort) {
        sort = this.sort();
      } else {
        const kd = this.keepDrop();
        if (kd) keepDrop.push(kd);
        else if (!target && (target = this.compare())) continue;
        else break;
      }
    }

    // 1–2: min and max, on every roll.
    const roll = (): Face => {
      if (++this.rolls > MAX_ROLLS) fail();
      const r = this.random();
      const v = fudge === 1 ? [-1, 0, 0, 0, 0, 1][Math.floor(r * 6)] : fudge ? Math.floor(r * 3) - 1 : 1 + Math.floor(r * sides);
      if (min !== null && v < min) return { v: min, mark: "↑" };
      if (max !== null && v > max) return { v: max, mark: "↓" };
      return { v, mark: "" };
    };
    const newDie = (face: Face): Die => ({ faces: [face], rerolled: [], dropped: false, success: false, failure: false, crit: "" });
    let dice: Die[] = [];

    // 3: exploding, each die's rerolls before the next die. Each reroll
    // is one more die, or (compounding) adds to the same one;
    // penetrating ones count one less.
    if (!explode) dice = Array.from({ length: count }, () => newDie(roll()));
    else {
      const { compound, penetrate, when } = explode;
      const out: Die[] = [];
      for (let d = 0; d < count; d++) {
        let current = newDie(roll());
        out.push(current);
        let last = current.faces[0].v;
        for (let n = 0; n < MAX_ITERATIONS && meets(when, last); n++) {
          const face = roll();
          last = face.v;
          current.faces[current.faces.length - 1].mark += "!";
          const counted = penetrate ? { ...face, v: face.v - 1 } : face;
          if (compound) current.faces.push(counted);
          else {
            current = newDie(counted);
            out.push(current);
          }
        }
      }
      dice = out;
    }

    // 4: rerolling, until the result misses the condition (or once).
    if (reroll) {
      for (const die of dice) {
        for (let n = 0; n < (reroll.once ? 1 : MAX_ITERATIONS) && meets(reroll.when, total(die)); n++) {
          die.rerolled.push(total(die));
          die.faces = [roll()];
        }
      }
    }

    // 5: unique, rerolling a result already in the pool.
    if (unique) {
      const { once, when } = unique;
      dice.forEach((die, i) => {
        const repeated = () => dice.slice(0, i).some((d) => total(d) === total(die)) && (!when || meets(when, total(die)));
        for (let n = 0; n < (once ? 1 : MAX_ITERATIONS) && repeated(); n++) {
          die.rerolled.push(total(die));
          die.faces = [roll()];
        }
      });
    }

    // 6–7: keep and drop.
    applyKeepDrop(dice, total, keepDrop, (d) => (d.dropped = true));

    // 8: successes and failures.
    if (target) {
      for (const die of dice) {
        if (die.dropped) continue;
        die.success = meets(target, total(die));
        die.failure = !die.success && !!failure && meets(failure, total(die));
      }
    }

    // 9–10: criticals, only marked.
    for (const die of dice) {
      if (critSuccess && meets(critSuccess, total(die))) die.crit = "▲";
      else if (critFailure && meets(critFailure, total(die))) die.crit = "▼";
    }

    // 11: how they're written. Kept dice first, in the order a keep or
    // drop sorted them (6+5+3, 2✗), unless they're sorted on purpose.
    let shown = dice;
    const first = keepDrop[0];
    const order = sort ?? (first ? (first.highest === first.keep ? "desc" : "asc") : null);
    if (order) shown = [...dice].sort((a, b) => (order === "asc" ? 1 : -1) * (total(a) - total(b)));
    shown = [...shown.filter((d) => !d.dropped), ...shown.filter((d) => d.dropped)];

    return { kind: "dice", fudge: !!fudge, compound: !!explode?.compound, dice, shown, target, failure };
  }
}

function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function fudgeSymbol(v: number): string {
  return v > 0 ? "+" : v < 0 ? "−" : "0";
}

function dieText(node: Extract<Node, { kind: "dice" }>, die: Die): string {
  const face = (f: Face) => (node.fudge ? fudgeSymbol(f.v) : formatNumber(f.v)) + f.mark;
  const before = die.rerolled.map((v) => `${node.fudge ? fudgeSymbol(v) : formatNumber(v)}→`).join("");
  // In a pool a compounded die counts once, with its total ("7!!").
  const faces =
    node.target && die.faces.length > 1 ? `${formatNumber(total(die))}!!` : die.faces.map(face).join("+");
  const marks = (die.success ? "✓" : die.failure ? "✗" : "") + die.crit + (die.dropped ? "✗" : "");
  return before + faces + marks;
}

function diceText(node: Extract<Node, { kind: "dice" }>): string {
  const kept = node.shown.filter((d) => !d.dropped).map((d) => dieText(node, d));
  const dropped = node.shown.filter((d) => d.dropped).map((d) => dieText(node, d));
  // Added up: "4+2"; counted, or Fudge: "6✓ 5✓ 3", "+ 0 −".
  const joined = kept.join(node.target || node.fudge ? " " : "+");
  return dropped.length ? `${joined}${joined ? ", " : ""}${dropped.join(" ")}` : joined;
}

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 } as const;
const SHOWN_OP = { "+": "+", "-": "−", "*": "×", "/": "÷", "%": "%", "^": "^" } as const;

/** The roll written out, the same shape as the formula. */
function detail(node: Node): string {
  switch (node.kind) {
    case "num":
      return formatNumber(node.value);
    case "neg":
      return `−${detail(node.inner)}`;
    case "paren":
      return `(${detail(node.inner)})`;
    case "dice":
      return diceText(node);
    case "group":
      return `{${node.order
        .map((i) => {
          const sub = detail(node.subs[i]);
          const mark = node.hit[i] ? "✓" : node.miss[i] || node.out[i] ? "✗" : "";
          return mark && /[ +,]/.test(sub) ? `(${sub})${mark}` : sub + mark;
        })
        .join(", ")}}`;
    case "bin": {
      const side = (child: Node) => {
        const text = detail(child);
        const loose =
          (child.kind === "bin" && PRECEDENCE[child.op] < PRECEDENCE[node.op]) ||
          (child.kind === "dice" && PRECEDENCE[node.op] > 1 && /[ +,]/.test(text));
        return loose ? `(${text})` : text;
      };
      return `${side(node.left)} ${SHOWN_OP[node.op]} ${side(node.right)}`;
    }
  }
}

function hasDice(node: Node): boolean {
  return diceIn(node).length > 0;
}

function hasFudge(node: Node): boolean {
  switch (node.kind) {
    case "num":
      return false;
    case "neg":
    case "paren":
      return hasFudge(node.inner);
    case "bin":
      return hasFudge(node.left) || hasFudge(node.right);
    case "dice":
      return node.fudge;
    case "group":
      return node.subs.some(hasFudge);
  }
}

/**
 * Takes the description out: "// …" or "# …" to the end, "[ … ]" and
 * "/* … *\/" anywhere. Notation inside them isn't rolled.
 */
function splitDescription(input: string): { formula: string; description: string } {
  const parts: string[] = [];
  let formula = input
    .replace(/\/\*([\s\S]*?)\*\//g, (_, text: string) => (parts.push(text), " "))
    .replace(/\[([^\]]*)\]/g, (_, text: string) => (parts.push(text), " "));
  const tail = formula.match(/(?:\/\/|#)([\s\S]*)$/);
  if (tail) {
    parts.push(tail[1]);
    formula = formula.slice(0, tail.index);
  }
  return { formula, description: parts.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean).join(" ") };
}

export type Edge = "advantage" | "disadvantage";

/**
 * The same roll with advantage or disadvantage: rolled twice, keeping
 * the higher or the lower. A single die stays a dice roll ("d6" →
 * "2d6kh1"); anything else becomes a group of two ("2d6+3" →
 * "{2d6+3,2d6+3}kh1"). The description stays outside.
 */
export function withEdge(input: string, edge: Edge): string {
  const { formula, description } = splitDescription(input);
  const keep = edge === "advantage" ? "kh1" : "kl1";
  const trimmed = formula.trim();
  const single = trimmed.match(/^1?(d(?:\d+|%))$/i);
  const edged = single ? `2${single[1]}${keep}` : `{${trimmed},${trimmed}}${keep}`;
  return description ? `${edged} // ${description}` : edged;
}

/**
 * Rolls a formula (see the header) and writes it as a Lonelog roll:
 * "Strength 4d6dl1 -> 14 (6+5+3, 2✗)". Null if it can't be read.
 */
export function rollFormula(input: string, random: () => number = Math.random): string | null {
  const { formula: raw, description } = splitDescription(input);
  // Spaces only around operators: "2d6 + 3" is fine, "2d6 3" isn't 2d63.
  const formula = raw
    .trim()
    .toLowerCase()
    .replace(/\s*([+\-*/%^<>=!,(){}])\s*/g, "$1");
  if (!formula || /\s/.test(formula)) return null;

  let node: Node;
  try {
    node = new Parser(formula, random).parse();
  } catch (e) {
    if (e instanceof Unreadable) return null;
    throw e;
  }
  if (!hasDice(node)) return null;
  const result = value(node);
  if (!Number.isFinite(result)) return null;

  const written = formula.replace(/df/g, "dF");
  const plusSign = hasFudge(node) && result > 0 ? "+" : "";
  const only = node.kind === "dice" && node.dice.length === 1 ? node.dice[0] : null;
  const plain =
    only && node.kind === "dice" && !node.fudge && !node.target && only.faces.length === 1 &&
    !only.faces[0].mark && !only.rerolled.length && !only.crit && !only.dropped;
  const line = plain
    ? `${written} -> ${formatNumber(result)}`
    : `${written} -> ${plusSign}${formatNumber(result)} (${detail(node)})`;
  return description ? `${description} ${line}` : line;
}
