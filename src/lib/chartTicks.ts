/** Round values for a count's axis, from 0 to at least `max`, a few of them ("0, 5, 10"). */
export function countTicks(max: number): number[] {
  const top = Math.max(1, max);
  let step = 1;
  for (let power = 1; step * 4 < top; power *= 10) {
    step = [2, 5, 10].map((n) => n * power).find((n) => n * 4 >= top) ?? step * 10;
  }
  return Array.from({ length: Math.ceil(top / step) + 1 }, (_, i) => i * step);
}
