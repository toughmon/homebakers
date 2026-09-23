import type { SVGProps } from "react";

type IconName =
  | "search"
  | "heart"
  | "arrow"
  | "arrowLeft"
  | "clock"
  | "spark"
  | "book"
  | "users"
  | "plus"
  | "check"
  | "menu"
  | "close"
  | "pen"
  | "bookmark"
  | "message"
  | "chevron"
  | "play"
  | "pause";

export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    heart: (
      <path d="M20.6 8.1c0 4.2-8.6 10-8.6 10s-8.6-5.8-8.6-10a4.7 4.7 0 0 1 8.6-2.5 4.7 4.7 0 0 1 8.6 2.5Z" />
    ),
    arrow: (
      <>
        <path d="M3.5 12h16" />
        <path d="m13 5.5 6.5 6.5-6.5 6.5" />
      </>
    ),
    arrowLeft: (
      <>
        <path d="M20.5 12h-16" />
        <path d="M11 5.5 4.5 12l6.5 6.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6.5V12l3.5 2" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Z" />
        <path d="m19 18 .5 1.5L21 20l-1.5.5L19 22l-.5-1.5L17 20l1.5-.5L19 18Z" />
      </>
    ),
    book: (
      <>
        <path d="M12 5.3C9.5 3.6 6.7 3.2 3 3.5v15c3.7-.3 6.5.1 9 1.8 2.5-1.7 5.3-2.1 9-1.8v-15c-3.7-.3-6.5.1-9 1.8Z" />
        <path d="M12 5.3v15" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.3 19v-1a5.7 5.7 0 0 1 11.4 0v1H3.3Z" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8M17 13.5a5.2 5.2 0 0 1 3.7 5v.5h-3" />
      </>
    ),
    plus: (
      <>
        <path d="M12 4v16M4 12h16" />
      </>
    ),
    check: <path d="m4.5 12.5 5 5 10-11" />,
    menu: (
      <>
        <path d="M3 6h18M3 12h18M3 18h18" />
      </>
    ),
    close: (
      <>
        <path d="M5 5 19 19M19 5 5 19" />
      </>
    ),
    pen: (
      <>
        <path d="m4 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" />
        <path d="m14.5 7 3 3" />
      </>
    ),
    bookmark: <path d="M5.5 3.5h13v17L12 16l-6.5 4.5v-17Z" />,
    message: (
      <path d="M20 11.5a7.8 7.8 0 0 1-8 7.5 8.8 8.8 0 0 1-3.5-.7L4 20l1-4a7.2 7.2 0 0 1-1-4.5A7.8 7.8 0 0 1 12 4a7.8 7.8 0 0 1 8 7.5Z" />
    ),
    chevron: <path d="m7 9 5 5 5-5" />,
    play: <path d="m9 6 9 6-9 6V6Z" />,
    pause: (
      <>
        <path d="M8 6v12M16 6v12" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
