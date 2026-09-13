import jwt from 'jsonwebtoken';

/** Preserve legacy session JWTs, but never accept email links or other token purposes as bearer sessions. */
export function sessionUserId(token: string, secret: string): number | null {
  try {
    const claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof claims === 'string' || claims.purpose !== undefined ||
      !Number.isSafeInteger(claims.userId) || claims.userId <= 0 || typeof claims.exp !== 'number') return null;
    return claims.userId;
  } catch { return null; }
}
