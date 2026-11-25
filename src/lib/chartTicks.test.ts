import { expect, it } from "vitest";
import { countTicks } from "./chartTicks";

it("gives a few round values that reach the highest", () => {
  expect(countTicks(0)).toEqual([0, 1]);
  expect(countTicks(3)).toEqual([0, 1, 2, 3]);
  expect(countTicks(7)).toEqual([0, 2, 4, 6, 8]);
  expect(countTicks(23)).toEqual([0, 10, 20, 30]);
  expect(countTicks(135)).toEqual([0, 50, 100, 150]);
  for (let n = 1; n < 3000; n++) {
    const ticks = countTicks(n);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(n);
  }
});
