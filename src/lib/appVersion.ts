// Set at build time by vite.config.ts (`define`), from package.json and git.
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

/** The app's version (package.json), the newest changelog chapter's. */
export const APP_VERSION: string = __APP_VERSION__;

/** The commit it was built from, short; empty when built outside git. */
export const APP_COMMIT: string = __APP_COMMIT__;

/** "1.0.0 (ea1e2f8)": what to quote when reporting something. */
export function versionLabel(): string {
  return APP_COMMIT ? `${APP_VERSION} (${APP_COMMIT})` : APP_VERSION;
}
