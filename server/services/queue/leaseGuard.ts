/** A legacy job cannot be cancelled safely midway through provider calls.
 * Terminate the process on lease loss so it cannot continue making new calls.
 * Already accepted provider requests still require idempotency at the provider.
 */
export function guardJobLease(renew: () => Promise<boolean>, fatal: () => void = () => process.exit(1), intervalMs = 60_000) {
  let stopped = false;
  let checking = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const fail = () => { if (!stopped) { stopped = true; fatal(); } };
  const check = async () => {
    if (stopped || checking) return;
    checking = true;
    deadline = setTimeout(fail, 15_000);
    deadline.unref();
    try {
      if (!await renew()) fail();
    } catch {
      fail();
    } finally { clearTimeout(deadline); checking = false; }
  };
  const timer = setInterval(() => { void check(); }, intervalMs);
  timer.unref();
  return { check, stop() { stopped = true; clearInterval(timer); clearTimeout(deadline); } };
}
