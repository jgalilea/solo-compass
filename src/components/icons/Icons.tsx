import type { SVGProps } from "react";

/**
 * Set de iconos planos en línea (sin emoji), estilo consistente:
 * trazo 1.75, esquinas redondeadas, viewBox 24x24, hereda color con
 * currentColor para poder tintarse por Tailwind.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps) {
  const { size = 20, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export function IconCompass(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 6-4 1.5L10.5 10.5z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDice(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.2" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="15.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="15.8" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5c1.8-1 4.4-1 8 0v13c-3.6-1-6.2-1-8 0z" />
      <path d="M20 5.5c-1.8-1-4.4-1-8 0v13c3.6-1 6.2-1 8 0z" />
    </svg>
  );
}

export function IconScroll(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4h11a2 2 0 0 1 2 2v9.5a2.5 2.5 0 0 1-2.5 2.5H8" />
      <path d="M6 4a2 2 0 1 0 0 4" />
      <path d="M8 18a2 2 0 1 1-2-2h11" strokeLinejoin="round" />
      <path d="M9 8h6M9 11h6" />
    </svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4.5 21 19H3z" strokeLinejoin="round" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconAlertOctagon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" strokeLinejoin="round" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconStar({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(props)} fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.6l2.47 5.15 5.63.77-4.08 4.02.98 5.66L12 16.4l-5 2.8.98-5.66-4.08-4.02 5.63-.77z" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconPalette(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.8 2-1.9 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a3 3 0 0 0 3-3c0-5-3.6-8.9-8-8.9z" />
      <circle cx="7.3" cy="10.7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9.3" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16.7" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconExternalLink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
    </svg>
  );
}
