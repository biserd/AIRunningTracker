import { Agent } from "agents";
import type { State } from "../shared/coach";

type RunnerAgentState = {
  ownerKey: string | null;
  contextUpdatedAt: string | null;
  fingerprint: string | null;
  invalidatedAt: string | null;
};

type SnapshotRow = {
  fingerprint: string;
  payload: string;
  loaded_at: number;
  expires_at: number;
};

const ownerPattern = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();

/**
 * Private, server-only runner memory. The application deliberately does not
 * expose routeAgentRequest, so browsers cannot connect to or mutate it.
 */
export class RunnerCoachAgent extends Agent<Env, RunnerAgentState> {
  initialState: RunnerAgentState = {
    ownerKey: null,
    contextUpdatedAt: null,
    fingerprint: null,
    invalidatedAt: null,
  };

  async onStart() {
    this.ensureTable();
  }

  private ensureTable() {
    this.sql`
      CREATE TABLE IF NOT EXISTS runner_context (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        fingerprint TEXT NOT NULL,
        payload TEXT NOT NULL,
        loaded_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `;
  }

  private assertOwner(ownerKey: string) {
    if (!ownerPattern.test(ownerKey)) throw new Error("Invalid runner key");
    if (this.state.ownerKey && this.state.ownerKey !== ownerKey)
      throw new Error("Runner context isolation failure");
    if (!this.state.ownerKey)
      this.setState({ ...this.state, ownerKey });
  }

  async getSnapshot(
    ownerKey: string,
    fingerprint: string,
    now: number,
  ): Promise<State | null> {
    this.ensureTable();
    this.assertOwner(ownerKey);
    if (!ownerPattern.test(fingerprint) || !Number.isSafeInteger(now))
      throw new Error("Invalid context lookup");
    const row = this.sql<SnapshotRow>`
      SELECT fingerprint, payload, loaded_at, expires_at
      FROM runner_context WHERE id = 1 AND fingerprint = ${fingerprint}
      AND expires_at > ${now} LIMIT 1
    `[0];
    return row ? (JSON.parse(row.payload) as State) : null;
  }

  async getLatest(
    ownerKey: string,
    now: number,
    maxAgeSeconds: number,
  ): Promise<State | null> {
    this.ensureTable();
    this.assertOwner(ownerKey);
    if (
      !Number.isSafeInteger(now) ||
      !Number.isSafeInteger(maxAgeSeconds) ||
      maxAgeSeconds < 1 ||
      maxAgeSeconds > 900
    )
      throw new Error("Invalid context lookup");
    const earliest = now - maxAgeSeconds;
    const row = this.sql<SnapshotRow>`
      SELECT fingerprint, payload, loaded_at, expires_at
      FROM runner_context WHERE id = 1 AND loaded_at >= ${earliest}
      AND expires_at > ${now} LIMIT 1
    `[0];
    return row ? (JSON.parse(row.payload) as State) : null;
  }

  async putSnapshot(
    ownerKey: string,
    fingerprint: string,
    snapshot: State,
    now: number,
    ttlSeconds: number,
  ) {
    this.ensureTable();
    this.assertOwner(ownerKey);
    if (
      !ownerPattern.test(fingerprint) ||
      snapshot.source !== "production_account" ||
      !Number.isSafeInteger(now) ||
      !Number.isSafeInteger(ttlSeconds) ||
      ttlSeconds < 30 ||
      ttlSeconds > 900
    )
      throw new Error("Invalid runner context");
    const payload = JSON.stringify(snapshot);
    if (encoder.encode(payload).length > 1_500_000)
      throw new Error("Runner context is too large");
    this.sql`
      INSERT INTO runner_context(id, fingerprint, payload, loaded_at, expires_at)
      VALUES (1, ${fingerprint}, ${payload}, ${now}, ${now + ttlSeconds})
      ON CONFLICT(id) DO UPDATE SET fingerprint = excluded.fingerprint,
      payload = excluded.payload, loaded_at = excluded.loaded_at,
      expires_at = excluded.expires_at
    `;
    this.setState({
      ...this.state,
      ownerKey,
      contextUpdatedAt: new Date(now * 1000).toISOString(),
      fingerprint,
      invalidatedAt: null,
    });
    return { ok: true };
  }

  async invalidate(ownerKey: string) {
    this.ensureTable();
    this.assertOwner(ownerKey);
    this.sql`DELETE FROM runner_context WHERE id = 1`;
    this.setState({
      ...this.state,
      fingerprint: null,
      invalidatedAt: new Date().toISOString(),
    });
    return { ok: true };
  }
}
