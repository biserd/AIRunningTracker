import { jwtVerify } from 'jose';

const verified = Symbol('verified-runner');
export type RunnerSession = Readonly<{ userId: number; [verified]: true }>;

/** Verifies existing web sessions only. Never accepts email/MCP tokens as sessions. */
export async function verifyRunnerSession(token: string, signingSecret: string): Promise<RunnerSession> {
  if (signingSecret.length < 32 || token.length > 8192) throw new Error('UNAUTHORIZED');
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(signingSecret), {
      algorithms: ['HS256'], requiredClaims: ['exp', 'iat'], maxTokenAge: '7d',
    });
    if (payload.purpose !== undefined || payload.scope !== undefined ||
        !Number.isSafeInteger(payload.userId) || Number(payload.userId) <= 0 ||
        typeof payload.email !== 'string' || !payload.email) throw new Error();
    return Object.freeze({ userId: Number(payload.userId), [verified]: true as const });
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}

export function assertRunnerSession(session: RunnerSession): void {
  if (session[verified] !== true) throw new Error('UNAUTHORIZED');
}
