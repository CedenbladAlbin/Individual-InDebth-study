import { getDb } from '$lib/db';
import { ObjectId } from 'mongodb';

/**
 * GET /api/scenes?gameId=...
 * Returns all scenes for a game.
 */
/**
 * @param {{ url: URL, request: Request }} param0
 */
export async function GET({ url, request }) {
  const gameId = url.searchParams.get('gameId');
  if (!gameId) return new Response('Missing gameId', { status: 400 });
  const db = await getDb();
  const scenes = await db.collection('scenes').find({ gameId }).toArray();
  return new Response(JSON.stringify(scenes), { status: 200 });
}

/**
 * POST /api/scenes
 * Create a new scene. Expects JSON: { gameId, data }
 */
/**
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const { gameId, data } = await request.json();
  if (!gameId || !data) return new Response('Missing fields', { status: 400 });
  const db = await getDb();
  const result = await db.collection('scenes').insertOne({ ...data, gameId });
  return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
}

/**
 * PATCH /api/scenes?id=...
 * Update a scene. Expects JSON: { data }
 */
/**
 * @param {{ url: URL, request: Request }} param0
 */
export async function PATCH({ url, request }) {
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });
  const { data } = await request.json();
  if (!data) return new Response('Missing data', { status: 400 });
  const db = await getDb();
  await db.collection('scenes').updateOne({ _id: new ObjectId(id) }, { $set: data });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * DELETE /api/scenes?id=...
 * Delete a scene by id.
 */
/**
 * @param {{ url: URL }} param0
 */
export async function DELETE({ url }) {
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });
  const db = await getDb();
  await db.collection('scenes').deleteOne({ _id: new ObjectId(id) });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
