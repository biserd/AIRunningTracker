/** Public image reads only. Private object keys can never be reached here. */
export async function servePublicAsset(request: Request, bucket: Pick<R2Bucket, 'get' | 'head'>): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith('/public-objects/')) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const key = pathname.slice('/public-objects/'.length);
  if (!/^(shoes|og)\/[a-z0-9-]+\.(jpg|jpeg|png|webp|avif)$/.test(key)) {
    return new Response('Not found', { status: 404 });
  }
  const object = request.method === 'HEAD' ? await bucket.head(`public/${key}`) : await bucket.get(`public/${key}`);
  if (!object) return new Response('Not found', { status: 404 });
  const body = 'body' in object && object.body instanceof ReadableStream ? object.body : null;
  const headers = new Headers({
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Length': String(object.size),
    'Cache-Control': 'public, max-age=86400',
    'ETag': object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  });
  const matches = request.headers.get('if-none-match')?.split(',').map(value => value.trim().replace(/^W\//, ''));
  if (matches?.includes('*') || matches?.includes(object.httpEtag)) {
    headers.delete('Content-Length');
    await body?.cancel();
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}
