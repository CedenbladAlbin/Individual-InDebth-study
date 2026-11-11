import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { requireUser, requireEntity } from '$lib/server/access.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

/**
 * POST /api/scenes/[id]/image  multipart/form-data with field 'image'
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ params, request, locals }) {
  const userId = requireUser(locals);
  const scene = await requireEntity('scene', params.id, userId);
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BYTES + 64 * 1024) error(413, 'Image is too large (max 5 MB)');

  let form;
  try {
    form = await request.formData();
  } catch {
    // Also reached when the server's BODY_SIZE_LIMIT (adapter-node, default 512 KB) is lower than MAX_BYTES
    error(413, 'Image is too large for the server upload limit');
  }
  const file = form.get('image');
  if (!(file instanceof Blob)) error(400, 'No image uploaded');
  if (!ALLOWED_TYPES.has(file.type)) error(415, 'Only PNG, JPEG, GIF and WebP images are allowed');
  if (file.size > MAX_BYTES) error(413, 'Image is too large (max 5 MB)');

  const buffer = Buffer.from(await file.arrayBuffer());
  const db = await getDb();
  // Stored as base64 in MongoDB; a file store (e.g. S3) would scale better
  await db.collection('scenes').updateOne(
    { _id: scene._id },
    { $set: { image: buffer.toString('base64'), imageType: file.type } }
  );
  return json({ success: true });
}

/**
 * GET /api/scenes/[id]/image
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ params, locals }) {
  const userId = requireUser(locals);
  const scene = await requireEntity('scene', params.id, userId);
  if (!scene.image) error(404, 'No image');
  const buffer = Buffer.from(scene.image, 'base64');
  return new Response(buffer, {
    headers: {
      'Content-Type': ALLOWED_TYPES.has(scene.imageType) ? scene.imageType : 'application/octet-stream',
      'Content-Length': String(buffer.length),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store'
    }
  });
}
