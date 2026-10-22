import type { ComponentType, SVGProps } from "react";
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTurnDownRightIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  Bars2Icon,
  BoltIcon,
  BookmarkIcon,
  BookOpenIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  Cog6ToothIcon,
  CubeIcon,
  EllipsisHorizontalIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  InformationCircleIcon,
  LanguageIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  StarIcon,
  SwatchIcon,
  TableCellsIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

/**
 * Iconos de la app: Heroicons (outline, 24px), envueltos para
 * mantener una API única (`size` en px, heredan color con
 * currentColor para tintarse con Tailwind). Si hace falta uno nuevo,
 * se elige el Heroicon más cercano y se añade aquí — no se dibujan
 * SVG a mano. La única excepción es el logo (IconCompass).
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function HeroIcon({ icon: Icon, size = 20, ...rest }: IconProps & { icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return <Icon width={size} height={size} aria-hidden {...rest} />;
}

/** Logo de la app (no es un Heroicon: es la marca). */
export function IconCompass({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 6-4 1.5L10.5 10.5z" />
    </svg>
  );
}

export function IconStar({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return <HeroIcon icon={filled ? StarSolidIcon : StarIcon} {...props} />;
}

// Secciones
export function IconOracle(props: IconProps) {
  return <HeroIcon icon={SparklesIcon} {...props} />;
}
export function IconTable(props: IconProps) {
  return <HeroIcon icon={TableCellsIcon} {...props} />;
}
export function IconJournal(props: IconProps) {
  return <HeroIcon icon={BookOpenIcon} {...props} />;
}
export function IconHistory(props: IconProps) {
  return <HeroIcon icon={ClockIcon} {...props} />;
}
export function IconSettings(props: IconProps) {
  return <HeroIcon icon={Cog6ToothIcon} {...props} />;
}

// Tipos de entrada del diario (equivalen a los símbolos de Lonelog)
export function IconQuestion(props: IconProps) {
  return <HeroIcon icon={QuestionMarkCircleIcon} {...props} />;
}
export function IconDice(props: IconProps) {
  return <HeroIcon icon={CubeIcon} {...props} />;
}
export function IconAction(props: IconProps) {
  return <HeroIcon icon={BoltIcon} {...props} />;
}
export function IconConsequence(props: IconProps) {
  return <HeroIcon icon={ArrowTurnDownRightIcon} {...props} />;
}
export function IconNote(props: IconProps) {
  return <HeroIcon icon={ChatBubbleBottomCenterTextIcon} {...props} />;
}
export function IconSession(props: IconProps) {
  return <HeroIcon icon={BookmarkIcon} {...props} />;
}

// Acciones y estados
export function IconAlertTriangle(props: IconProps) {
  return <HeroIcon icon={ExclamationTriangleIcon} {...props} />;
}
export function IconAlertCircle(props: IconProps) {
  return <HeroIcon icon={ExclamationCircleIcon} {...props} />;
}
export function IconTrash(props: IconProps) {
  return <HeroIcon icon={TrashIcon} {...props} />;
}
export function IconClose(props: IconProps) {
  return <HeroIcon icon={XMarkIcon} {...props} />;
}
export function IconPalette(props: IconProps) {
  return <HeroIcon icon={SwatchIcon} {...props} />;
}
export function IconCheck(props: IconProps) {
  return <HeroIcon icon={CheckIcon} {...props} />;
}
export function IconCheckCircle(props: IconProps) {
  return <HeroIcon icon={CheckCircleIcon} {...props} />;
}
export function IconInfo(props: IconProps) {
  return <HeroIcon icon={InformationCircleIcon} {...props} />;
}
export function IconHeart(props: IconProps) {
  return <HeroIcon icon={HeartIcon} {...props} />;
}
export function IconExternalLink(props: IconProps) {
  return <HeroIcon icon={ArrowTopRightOnSquareIcon} {...props} />;
}
export function IconSearch(props: IconProps) {
  return <HeroIcon icon={MagnifyingGlassIcon} {...props} />;
}
export function IconList(props: IconProps) {
  return <HeroIcon icon={ListBulletIcon} {...props} />;
}
export function IconLanguage(props: IconProps) {
  return <HeroIcon icon={LanguageIcon} {...props} />;
}
export function IconSwap(props: IconProps) {
  return <HeroIcon icon={ArrowsRightLeftIcon} {...props} />;
}
export function IconDownload(props: IconProps) {
  return <HeroIcon icon={ArrowDownTrayIcon} {...props} />;
}
export function IconUpload(props: IconProps) {
  return <HeroIcon icon={ArrowUpTrayIcon} {...props} />;
}
export function IconPlus(props: IconProps) {
  return <HeroIcon icon={PlusIcon} {...props} />;
}
export function IconPencil(props: IconProps) {
  return <HeroIcon icon={PencilIcon} {...props} />;
}
export function IconGripVertical(props: IconProps) {
  return <HeroIcon icon={Bars2Icon} {...props} />;
}
export function IconChevronRight(props: IconProps) {
  return <HeroIcon icon={ChevronRightIcon} {...props} />;
}
export function IconChevronDown(props: IconProps) {
  return <HeroIcon icon={ChevronDownIcon} {...props} />;
}
export function IconArrowLeft(props: IconProps) {
  return <HeroIcon icon={ArrowLeftIcon} {...props} />;
}
export function IconPause(props: IconProps) {
  return <HeroIcon icon={PauseIcon} {...props} />;
}
export function IconPlay(props: IconProps) {
  return <HeroIcon icon={PlayIcon} {...props} />;
}
export function IconArchive(props: IconProps) {
  return <HeroIcon icon={ArchiveBoxIcon} {...props} />;
}
export function IconArchiveRestore(props: IconProps) {
  return <HeroIcon icon={ArrowUturnLeftIcon} {...props} />;
}
export function IconMore(props: IconProps) {
  return <HeroIcon icon={EllipsisHorizontalIcon} {...props} />;
}

export function IconShieldCheck(props: IconProps) {
  return <HeroIcon icon={ShieldCheckIcon} {...props} />;
}

export function IconShieldAlert(props: IconProps) {
  return <HeroIcon icon={ShieldExclamationIcon} {...props} />;
}

export function IconChronicle(props: IconProps) {
  return <HeroIcon icon={NewspaperIcon} {...props} />;
}

export function IconSparkles(props: IconProps) {
  return <HeroIcon icon={SparklesIcon} {...props} />;
}
