/** Keep Replit behavior unchanged while the Cloudflare deployment is rehearsed. */
export function isCloudflareRuntime(): boolean {
  return process.env.APP_PLATFORM === 'cloudflare';
}

export function isMigrationStaging(): boolean {
  return isCloudflareRuntime() && process.env.APP_ENV !== 'production';
}

export function ownsScheduledJobs(): boolean {
  return !isCloudflareRuntime() ||
    (process.env.APP_ENV === 'production' && process.env.APP_ROLE === 'jobs');
}

export function mayInitializeSchema(): boolean {
  return !isCloudflareRuntime();
}
