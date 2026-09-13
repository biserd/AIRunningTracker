type LeadershipClient = {
  query(sql: string): Promise<{ rows: { acquired?: boolean }[] }>;
  release(destroy?: boolean): void;
  on(event: 'error' | 'end', listener: () => void): unknown;
};

/** Dedicated Postgres session owns all legacy timers. A rolling deploy cannot start a second owner. */
export function runAsSchedulerLeader(pool: { connect(): Promise<LeadershipClient> }, start: () => Promise<void>): void {
  let trying = false;
  let leader: LeadershipClient | null = null;
  const attempt = async () => {
    if (trying || leader) return;
    trying = true;
    let client: LeadershipClient | null = null;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT pg_try_advisory_lock(1296126535, 1) AS acquired');
      if (!result.rows[0]?.acquired) { client.release(); return; }
      leader = client;
      // Fail closed if the database connection disappears. Do not let timers run without ownership.
      const terminate = () => { console.error('[Scheduler] Leadership lost; stopping process'); process.exit(1); };
      client.on('error', terminate);
      client.on('end', terminate);
      let lastVerified = Date.now();
      let checking = false;
      setInterval(() => {
        if (Date.now() - lastVerified > 45_000) terminate();
        if (checking) return;
        checking = true;
        void leader!.query('SELECT 1').then(() => { lastVerified = Date.now(); }, terminate)
          .finally(() => { checking = false; });
      }, 10_000).unref();
      await start();
      console.log('[Scheduler] Leadership acquired');
    } catch {
      if (leader) process.exit(1);
      client?.release(true);
      console.error('[Scheduler] Leadership unavailable; no jobs started');
    } finally { trying = false; }
  };
  void attempt();
  setInterval(() => { void attempt(); }, 15_000).unref();
}
