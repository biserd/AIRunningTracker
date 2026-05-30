import fs from 'fs';
import path from 'path';
import { objectStorageClient } from '../server/replit_integrations/object_storage/objectStorage';

function parsePublicSearchPath(): { bucketName: string; prefix: string } {
  const raw = (process.env.PUBLIC_OBJECT_SEARCH_PATHS || '').split(',')[0]?.trim();
  if (!raw) throw new Error('PUBLIC_OBJECT_SEARCH_PATHS env var is empty');
  const trimmed = raw.startsWith('/') ? raw.slice(1) : raw;
  const slash = trimmed.indexOf('/');
  if (slash < 0) return { bucketName: trimmed, prefix: '' };
  return { bucketName: trimmed.slice(0, slash), prefix: trimmed.slice(slash + 1).replace(/\/$/, '') };
}

async function main() {
  const { bucketName, prefix } = parsePublicSearchPath();
  const bucket = objectStorageClient.bucket(bucketName);
  const localPath = path.resolve(process.cwd(), 'attached_assets', 'og-chrome-extension.jpg');
  const buf = fs.readFileSync(localPath);
  const key = `${prefix ? prefix + '/' : ''}og/chrome-extension.jpg`;
  await bucket.file(key).save(buf, {
    contentType: 'image/jpeg',
    resumable: false,
    metadata: { cacheControl: 'public, max-age=86400' },
  });
  console.log(`Uploaded ${(buf.byteLength / 1024).toFixed(0)} KB to ${bucketName}/${key}`);
  console.log(`Served at /public-objects/og/chrome-extension.jpg`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
