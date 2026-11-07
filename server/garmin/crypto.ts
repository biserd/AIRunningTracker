import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const garminHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const garminRandom = () => randomBytes(32).toString('base64url');
export const garminChallenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
export function garminEqual(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function key(value: string) {
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32) throw new Error('GARMIN_ENCRYPTION_KEY_REQUIRED');
  return decoded;
}
export function sealGarmin(value: string, secret: string, context: string) {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(secret), nonce);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}
export function openGarmin(value: string, secret: string, context: string) {
  const [version, nonce, encrypted, tag, extra] = value.split('.');
  if (version !== 'v1' || !nonce || !encrypted || !tag || extra) throw new Error('INVALID_GARMIN_CIPHERTEXT');
  const decipher = createDecipheriv('aes-256-gcm', key(secret), Buffer.from(nonce, 'base64url'));
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}
