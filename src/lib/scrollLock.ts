/**
 * The page behind doesn't scroll while a dialog or a dropdown menu is
 * open (a scroll inside the panel, on the backdrop or beside a menu
 * used to move the page too). A counter, since they can be stacked:
 * only the last one to close unlocks it. The scrollbar's width is kept
 * as padding so the page doesn't shift sideways on desktop.
 */

let scrollLocks = 0;
let savedRootStyle: { overflow: string; paddingRight: string } | null = null;

export function lockPageScroll() {
  if (scrollLocks++ > 0) return;
  const root = document.documentElement;
  const scrollbar = window.innerWidth - root.clientWidth;
  savedRootStyle = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
  root.style.overflow = "hidden";
  if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
}

export function unlockPageScroll() {
  if (--scrollLocks > 0 || !savedRootStyle) return;
  const root = document.documentElement;
  root.style.overflow = savedRootStyle.overflow;
  root.style.paddingRight = savedRootStyle.paddingRight;
  savedRootStyle = null;
}
