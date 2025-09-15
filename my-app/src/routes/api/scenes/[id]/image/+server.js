import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

/**
 * POST /api/scenes/[id]/image
 * Upload an image for a scene. Expects multipart/form-data with a file field named 'image'.
 */
/**
 * @param {{ params: { id: string }, request: Request }} param0
 */
export async function POST({ params, request }) {
  const sceneId = params.id;
  if (!sceneId) return new Response('Missing scene id', { status: 400 });

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('image');
  if (!(file instanceof Blob)) {
    return new Response('No image uploaded', { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  // Store image as base64 in DB (for demo; in production use a file store or S3)
  const db = await getDb();
  await db.collection('scenes').updateOne(
    { _id: new ObjectId(sceneId) },
    { $set: { image: buffer.toString('base64'), imageType: file.type } }
  );
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * GET /api/scenes/[id]/image
 * Returns the image for a scene, if any.
 */
/**
 * @param {{ params: { id: string } }} param0
 */
export async function GET({ params }) {
  const sceneId = params.id;
  if (!sceneId) return new Response('Missing scene id', { status: 400 });
  const db = await getDb();
  const scene = await db.collection('scenes').findOne({ _id: new ObjectId(sceneId) });
  if (!scene || !scene.image) return new Response('No image', { status: 404 });
  const buffer = Buffer.from(scene.image, 'base64');
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': scene.imageType || 'image/png',
      'Content-Length': buffer.length.toString()
    }
  });
}
