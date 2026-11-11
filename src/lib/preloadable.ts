import { createElement, lazy, useState, type ComponentType } from "react";

/** Every preloadable component made so far, for `preloadAll`. */
const registry: (() => Promise<unknown>)[] = [];

/**
 * A component whose code is its own chunk, kept out of the main bundle
 * (what a first visit downloads before anything shows). Unlike a bare
 * `React.lazy`, once its chunk has arrived it renders straight away,
 * without suspending for a tick: `preloadAll` fetches every one shortly
 * after start-up, so moving to another screen never shows a blank.
 * Needs a <Suspense> above it for the rare case it isn't there yet.
 */
export function preloadable<P extends object>(load: () => Promise<ComponentType<P>>) {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (component) => (loaded = component),
      (error: unknown) => {
        // Let a later render try again (e.g. it was offline for a moment).
        pending = null;
        throw error;
      },
    ));
  const Lazy = lazy(() => preload().then((component) => ({ default: component })));
  registry.push(preload);

  function Preloadable(props: P) {
    // Chosen once per mount: switching from Lazy to the loaded component
    // in a later render would remount it and lose its state.
    const [Component] = useState<ComponentType<P>>(() => loaded ?? Lazy);
    return createElement(Component, props);
  }
  return Preloadable;
}

/**
 * Fetches every preloadable chunk while the browser is idle, once the
 * first screen is up. The service worker caches them too, but only
 * this makes them ready to render without suspending.
 */
export function preloadAll(): void {
  const run = () => {
    for (const preload of registry) preload().catch(() => {});
  };
  const whenIdle = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 });
    else setTimeout(run, 1500);
  };
  // After the theme's fonts, which the first screen is waiting for:
  // on a slow connection the chunks would share the bandwidth with them.
  void document.fonts.ready.then(whenIdle, whenIdle);
}
