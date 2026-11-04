import type { SVGProps } from "react";
import * as Tabler from "@tabler/icons-react";

/**
 * App icons: Tabler Icons (MIT), wrapped to keep a single API (`size`
 * in px; they inherit currentColor so Tailwind can tint them). Screens
 * only import from here, so changing an icon is a one-line change. If a
 * new one is needed, pick the closest Tabler icon
 * (https://tabler.io/icons) and add it here — no hand-drawn SVG. The
 * only exception is the logo (IconCompass).
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number };

// Slightly thinner stroke than the default (2): at 2 they looked too
// heavy next to text at the app's small sizes.
function TablerIcon({ icon: Icon, size = 20, strokeWidth = 1.75, ...rest }: IconProps & { icon: Tabler.Icon }) {
  return <Icon size={size} stroke={strokeWidth} aria-hidden {...rest} />;
}

/**
 * App logo (not from Tabler: it's the brand). A four-point compass
 * rose with one face of each point filled; it's the same drawing as the
 * installed icon and the favicon (public/), so the brand looks the
 * same inside and outside the app.
 */
export function IconCompass({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <circle cx="12" cy="12" r="9.25" strokeWidth={1.5} />
      <path
        d="M12 4.25L13.75 10.25L19.75 12L13.75 13.75L12 19.75L10.25 13.75L4.25 12L10.25 10.25Z"
        strokeWidth={0.9}
      />
      <path
        d="M12 4.25L13.75 10.25L12 12ZM19.75 12L13.75 13.75L12 12ZM12 19.75L10.25 13.75L12 12ZM4.25 12L10.25 10.25L12 12Z"
        fill="currentColor"
        strokeWidth={0.9}
      />
    </svg>
  );
}

export function IconStar({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return <TablerIcon icon={filled ? Tabler.IconStarFilled : Tabler.IconStar} {...props} />;
}

// Sections
// The oracle: a crystal ball.
export function IconOracle(props: IconProps) {
  return <TablerIcon icon={Tabler.IconCrystalBall} {...props} />;
}
// A meaning table is a numbered list rolled with a die.
export function IconTable(props: IconProps) {
  return <TablerIcon icon={Tabler.IconListNumbers} {...props} />;
}
export function IconJournal(props: IconProps) {
  return <TablerIcon icon={Tabler.IconBook} {...props} />;
}
export function IconHistory(props: IconProps) {
  return <TablerIcon icon={Tabler.IconHistory} {...props} />;
}
export function IconSettings(props: IconProps) {
  return <TablerIcon icon={Tabler.IconSettings} {...props} />;
}

// Journal entry kinds (matching the Lonelog symbols)
export function IconQuestion(props: IconProps) {
  return <TablerIcon icon={Tabler.IconHelpCircle} {...props} />;
}
export function IconDice(props: IconProps) {
  return <TablerIcon icon={Tabler.IconDice5} {...props} />;
}
export function IconAction(props: IconProps) {
  return <TablerIcon icon={Tabler.IconSword} {...props} />;
}
export function IconConsequence(props: IconProps) {
  return <TablerIcon icon={Tabler.IconCornerDownRight} {...props} />;
}
// Written with a quill: free narration.
export function IconNote(props: IconProps) {
  return <TablerIcon icon={Tabler.IconFeather} {...props} />;
}
export function IconSession(props: IconProps) {
  return <TablerIcon icon={Tabler.IconBookmark} {...props} />;
}

// Actions and states
export function IconAlertTriangle(props: IconProps) {
  return <TablerIcon icon={Tabler.IconAlertTriangle} {...props} />;
}
export function IconAlertCircle(props: IconProps) {
  return <TablerIcon icon={Tabler.IconAlertCircle} {...props} />;
}
export function IconTrash(props: IconProps) {
  return <TablerIcon icon={Tabler.IconTrash} {...props} />;
}
export function IconClose(props: IconProps) {
  return <TablerIcon icon={Tabler.IconX} {...props} />;
}
export function IconPalette(props: IconProps) {
  return <TablerIcon icon={Tabler.IconPalette} {...props} />;
}
export function IconCheck(props: IconProps) {
  return <TablerIcon icon={Tabler.IconCheck} {...props} />;
}
export function IconCheckCircle(props: IconProps) {
  return <TablerIcon icon={Tabler.IconCircleCheck} {...props} />;
}
export function IconInfo(props: IconProps) {
  return <TablerIcon icon={Tabler.IconInfoCircle} {...props} />;
}
export function IconHeart(props: IconProps) {
  return <TablerIcon icon={Tabler.IconHeart} {...props} />;
}
export function IconExternalLink(props: IconProps) {
  return <TablerIcon icon={Tabler.IconExternalLink} {...props} />;
}
export function IconSearch(props: IconProps) {
  return <TablerIcon icon={Tabler.IconSearch} {...props} />;
}
export function IconList(props: IconProps) {
  return <TablerIcon icon={Tabler.IconList} {...props} />;
}
export function IconLanguage(props: IconProps) {
  return <TablerIcon icon={Tabler.IconLanguage} {...props} />;
}
export function IconSwap(props: IconProps) {
  return <TablerIcon icon={Tabler.IconArrowsLeftRight} {...props} />;
}
export function IconDownload(props: IconProps) {
  return <TablerIcon icon={Tabler.IconDownload} {...props} />;
}
export function IconShare(props: IconProps) {
  return <TablerIcon icon={Tabler.IconShare} {...props} />;
}
export function IconChart(props: IconProps) {
  return <TablerIcon icon={Tabler.IconChartBar} {...props} />;
}
export function IconUpload(props: IconProps) {
  return <TablerIcon icon={Tabler.IconUpload} {...props} />;
}
export function IconPlus(props: IconProps) {
  return <TablerIcon icon={Tabler.IconPlus} {...props} />;
}
export function IconPencil(props: IconProps) {
  return <TablerIcon icon={Tabler.IconPencil} {...props} />;
}
export function IconGripVertical(props: IconProps) {
  return <TablerIcon icon={Tabler.IconGripVertical} {...props} />;
}
export function IconChevronRight(props: IconProps) {
  return <TablerIcon icon={Tabler.IconChevronRight} {...props} />;
}
export function IconChevronUpDown(props: IconProps) {
  return <TablerIcon icon={Tabler.IconSelector} {...props} />;
}
export function IconMinus(props: IconProps) {
  return <TablerIcon icon={Tabler.IconMinus} {...props} />;
}
export function IconEquals(props: IconProps) {
  return <TablerIcon icon={Tabler.IconEqual} {...props} />;
}
export function IconChevronDown(props: IconProps) {
  return <TablerIcon icon={Tabler.IconChevronDown} {...props} />;
}
export function IconArrowLeft(props: IconProps) {
  return <TablerIcon icon={Tabler.IconArrowLeft} {...props} />;
}
export function IconPause(props: IconProps) {
  return <TablerIcon icon={Tabler.IconPlayerPause} {...props} />;
}
export function IconPlay(props: IconProps) {
  return <TablerIcon icon={Tabler.IconPlayerPlay} {...props} />;
}
export function IconArchive(props: IconProps) {
  return <TablerIcon icon={Tabler.IconArchive} {...props} />;
}
export function IconArchiveRestore(props: IconProps) {
  return <TablerIcon icon={Tabler.IconArrowBackUp} {...props} />;
}
export function IconSend(props: IconProps) {
  return <TablerIcon icon={Tabler.IconSend} {...props} />;
}
export function IconMore(props: IconProps) {
  return <TablerIcon icon={Tabler.IconDots} {...props} />;
}
export function IconShieldCheck(props: IconProps) {
  return <TablerIcon icon={Tabler.IconShieldCheck} {...props} />;
}
export function IconShieldAlert(props: IconProps) {
  return <TablerIcon icon={Tabler.IconShieldExclamation} {...props} />;
}
// The changelog: a scroll.
export function IconChronicle(props: IconProps) {
  return <TablerIcon icon={Tabler.IconScript} {...props} />;
}
export function IconSparkles(props: IconProps) {
  return <TablerIcon icon={Tabler.IconSparkles} {...props} />;
}
export function IconInstall(props: IconProps) {
  return <TablerIcon icon={Tabler.IconDeviceMobileDown} {...props} />;
}
export function IconInstalled(props: IconProps) {
  return <TablerIcon icon={Tabler.IconDeviceMobileCheck} {...props} />;
}
