import { splitRollTotal } from "../lib/journalUi";

/** "+1 (+ 0 − +)" for 4dF: the total large and the faces small below. */
export function RollResult({ result }: { result: string }) {
  const { total, faces } = splitRollTotal(result);
  return (
    <>
      <span className="max-w-full break-words text-base font-medium leading-tight text-parchment">{total}</span>
      {faces && <span className="max-w-full break-words text-[0.65rem] leading-tight text-parchment-dim">{faces}</span>}
    </>
  );
}
