/**
 * The width every screen shares with the header, so switching tabs
 * doesn't make the content jump. Up to a tablet held upright it's the
 * whole screen (a cap there only left bands at the sides); from lg it
 * stops growing, and on a wide monitor (2xl) and on an ultrawide one
 * (4xl) it grows again, and the screens use it for more columns, never
 * for longer lines.
 */
export const PAGE_WIDTH = "mx-auto w-full lg:max-w-7xl 2xl:max-w-[110rem] 4xl:max-w-[152rem]";

/** A screen's frame: that width, its margins and the gap between its blocks. */
export const PAGE_CLASS = `${PAGE_WIDTH} flex flex-1 flex-col gap-5 px-4 pb-8 pt-5 md:gap-6 md:pt-8`;
