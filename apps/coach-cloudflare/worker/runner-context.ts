import type { State } from "../shared/coach";
import type { AccountSnapshot } from "./account";
import { trainingContext } from "./training-context";

const ttlSeconds = 300;

async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function runnerFingerprint(account: AccountSnapshot) {
  const state = structuredClone(account.state);
  delete state.trainingContext;
  delete state.recentConversation;
  // The account endpoint stamps every read with "now". It is freshness
  // metadata, not a data change, and must not defeat the context cache.
  delete state.updatedAt;
  return digest(
    JSON.stringify({
      runner: account.runner,
      canUseAI: account.canUseAI,
      state,
    }),
  );
}

export async function resolveRunnerState(
  env: Env,
  ownerKey: string,
  token: string,
  account: AccountSnapshot,
  force = false,
): Promise<State> {
  const fingerprint = await runnerFingerprint(account);
  const now = Math.floor(Date.now() / 1000);
  if (!env.RUNNER_COACH) {
    const state = structuredClone(account.state);
    state.trainingContext = await trainingContext(env, token, account);
    state.updatedAt = new Date().toISOString();
    return state;
  }
  const agent = env.RUNNER_COACH.getByName(ownerKey);
  if (!force) {
    try {
      const cached = await agent.getSnapshot(ownerKey, fingerprint, now);
      if (cached) return cached;
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "runner_context_cache_read_failed",
          errorType: error instanceof Error ? error.name : "unknown",
        }),
      );
    }
  }
  const state = structuredClone(account.state);
  state.trainingContext = await trainingContext(env, token, account);
  state.updatedAt = new Date().toISOString();
  try {
    await agent.putSnapshot(ownerKey, fingerprint, state, now, ttlSeconds);
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "runner_context_cache_write_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
  return state;
}

export async function latestRunnerState(
  env: Env,
  ownerKey: string,
  maxAgeSeconds = ttlSeconds,
): Promise<State | null> {
  if (!env.RUNNER_COACH) return null;
  try {
    return (await env.RUNNER_COACH.getByName(ownerKey).getLatest(
      ownerKey,
      Math.floor(Date.now() / 1000),
      maxAgeSeconds,
    )) as State | null;
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "runner_context_latest_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
    return null;
  }
}

export async function cacheRunnerState(
  env: Env,
  ownerKey: string,
  state: State,
) {
  if (!env.RUNNER_COACH) return;
  try {
    const now = Math.floor(Date.now() / 1000);
    const fingerprint = await digest(
      JSON.stringify({
        source: state.source,
        updatedAt: state.updatedAt,
        trainingLoadedAt: state.trainingContext?.loadedAt,
      }),
    );
    await env.RUNNER_COACH.getByName(ownerKey).putSnapshot(
      ownerKey,
      fingerprint,
      state,
      now,
      ttlSeconds,
    );
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "runner_context_seed_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
}

export async function invalidateRunnerState(env: Env, ownerKey: string) {
  if (!env.RUNNER_COACH) return;
  try {
    await env.RUNNER_COACH.getByName(ownerKey).invalidate(ownerKey);
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "runner_context_invalidation_failed",
        errorType: error instanceof Error ? error.name : "unknown",
      }),
    );
  }
}
