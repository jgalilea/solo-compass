import type { IconProps } from "../TablerIcon";

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
