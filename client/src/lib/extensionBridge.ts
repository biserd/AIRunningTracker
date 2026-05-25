// Auth bridge between the RunAnalytics web app and the Chrome extension.
// When the user signs in (any method) we forward the JWT to the extension
// via chrome.runtime.sendMessage so the content script + popup are signed
// in immediately. All calls are no-ops when:
//   • not running in a browser
//   • the extension isn't installed
//   • VITE_EXTENSION_ID isn't configured (e.g. before publishing)

const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID as string | undefined;

type ExtensionUser = { firstName?: string | null; email?: string | null };

function getChromeRuntime(): any {
  if (typeof window === 'undefined') return null;
  const c = (window as any).chrome;
  if (!c || !c.runtime || typeof c.runtime.sendMessage !== 'function') return null;
  return c.runtime;
}

export function notifyExtensionAuth(token: string, user: ExtensionUser): void {
  const runtime = getChromeRuntime();
  if (!runtime || !EXTENSION_ID || !token) return;
  try {
    runtime.sendMessage(
      EXTENSION_ID,
      {
        type: 'RA_AUTH_TOKEN',
        token,
        user: { firstName: user?.firstName ?? null, email: user?.email ?? null },
      },
      () => {
        // Suppress "Could not establish connection" when the extension isn't installed.
        if (runtime.lastError) return;
      },
    );
  } catch {
    // Extension not installed — safe to ignore
  }
}

export function notifyExtensionLogout(): void {
  const runtime = getChromeRuntime();
  if (!runtime || !EXTENSION_ID) return;
  try {
    runtime.sendMessage(
      EXTENSION_ID,
      { type: 'RA_LOGOUT' },
      () => {
        if (runtime.lastError) return;
      },
    );
  } catch {
    // ignore
  }
}
