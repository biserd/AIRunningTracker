/** Display hint injected by the staging Worker, never an authorization boundary. */
export const isReadOnlyStaging = typeof document !== 'undefined' &&
  document.querySelector('meta[name="app-environment"]')?.getAttribute('content') === 'staging';
export const stagingWriteMessage = 'Read-only staging: changes, syncing, AI generation and billing are disabled.';
