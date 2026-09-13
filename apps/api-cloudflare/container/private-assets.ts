const maximumBytes = 10 * 1024 * 1024;
const supported = new Set(['image/jpeg','image/png','image/webp','image/avif','application/pdf']);
type PrivateBucket = Pick<R2Bucket, 'put' | 'get' | 'head'>;
type Identity = () => Promise<number | null>;

async function boundedBody(request: Request, limit: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.length;
      if (size > limit) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** No signed URL secrets. Upload and download both require the runner's current session. */
export async function privateAssets(request: Request, bucket: PrivateBucket, identify: Identity,
  allowWrites: boolean, rateLimit: (userId: number) => Promise<boolean>): Promise<Response | null> {
  const url = new URL(request.url);
  const issuing = url.pathname === '/api/uploads/request-url';
  if (!issuing && !url.pathname.startsWith('/objects/')) return null;
  const reply = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if ((!issuing && !['GET','HEAD','PUT'].includes(request.method)) || (issuing && request.method !== 'POST')) return reply(405, 'Method not allowed');
  if (!allowWrites && ['POST','PUT'].includes(request.method)) return reply(503, 'MIGRATION_READ_ONLY');
  if (['POST','PUT'].includes(request.method) && request.headers.get('origin') !== url.origin) return reply(403, 'Invalid origin');
  const userId = await identify();
  if (!userId) return reply(401, 'Sign in required');
  if (!await rateLimit(userId)) return reply(429, 'Please try again shortly');
  if (issuing) {
    let metadata;
    try { metadata = JSON.parse(new TextDecoder().decode(await boundedBody(request, 2048))); }
    catch { return reply(400, 'Invalid upload details'); }
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || typeof metadata.name !== 'string' || metadata.name.length > 180 || !metadata.name.trim() ||
      !Number.isSafeInteger(metadata.size) || metadata.size < 1 || metadata.size > maximumBytes || !supported.has(metadata.contentType)) {
      return reply(400, 'Choose a JPG, PNG, WebP, AVIF or PDF file up to 10 MB');
    }
    const objectPath = `/objects/uploads/${userId}/${crypto.randomUUID()}`;
    return Response.json({ uploadURL: url.origin + objectPath, objectPath,
      metadata: { name: metadata.name, size: metadata.size, contentType: metadata.contentType } }, { headers: { 'Cache-Control':'no-store' } });
  }
  const match = /^\/objects\/uploads\/([1-9][0-9]*)\/([a-f0-9-]{36})$/.exec(url.pathname);
  if (!match || Number(match[1]) !== userId) return reply(404, 'Object not found');
  const key = `private/${userId}/${match[2]}`;
  if (request.method === 'PUT') {
    const type = request.headers.get('content-type') || '';
    if (!supported.has(type)) return reply(415, 'Unsupported file type');
    let bytes: Uint8Array;
    try { bytes = await boundedBody(request, maximumBytes); }
    catch { return reply(413, 'File must be under 10 MB'); }
    if (!bytes.length) return reply(400, 'File is empty');
    const result = await bucket.put(key, bytes, { onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: type, contentDisposition: 'attachment', cacheControl: 'private, no-store' } });
    if (!result) return reply(409, 'File already exists');
    return new Response(null, { status: 201, headers: { 'Cache-Control':'no-store' } });
  }
  const object = request.method === 'HEAD' ? await bucket.head(key) : await bucket.get(key);
  if (!object) return reply(404, 'Object not found');
  return new Response('body' in object && object.body instanceof ReadableStream ? object.body : null, {
    headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Length': String(object.size), 'Content-Disposition':'attachment', 'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; sandbox" },
  });
}
