import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { oid, requireUser, requireEntity, readJson, str } from '$lib/server/access.js';

/**
 * GET /api/game-content/notes?type=npc&entityId=...
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url, locals }) {
  const userId = requireUser(locals);
  const type = url.searchParams.get('type');
  const entityId = url.searchParams.get('entityId');
  await requireEntity(type, entityId, userId);
  const db = await getDb();
  return json(await db.collection('notes').find({ type, entityId, userId }).toArray());
}

/**
 * POST /api/game-content/notes  body: { type, entityId, title, text }
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
  const userId = requireUser(locals);
  const { type, entityId, title, text } = await readJson(request);
  if (!str(title).trim() || !str(text).trim()) error(400, 'Missing fields');
  await requireEntity(type, entityId, userId);
  const db = await getDb();
  await db.collection('notes').insertOne({ type, entityId, title: str(title, 200), text: str(text), userId, createdAt: new Date() });
  return json(await db.collection('notes').find({ type, entityId, userId }).toArray(), { status: 201 });
}

/**
 * PUT /api/game-content/notes  body: { noteId, title, text }
 * @type {import('./$types').RequestHandler}
 */
export async function PUT({ request, locals }) {
  const userId = requireUser(locals);
  const { noteId, title, text } = await readJson(request);
  if (!str(title).trim() || !str(text).trim()) error(400, 'Missing fields');
  const db = await getDb();
  const result = await db.collection('notes').updateOne(
    { _id: oid(noteId), userId },
    { $set: { title: str(title, 200), text: str(text) } }
  );
  if (result.matchedCount === 0) error(404, 'Note not found');
  return json({ success: true });
}

/**
 * DELETE /api/game-content/notes?noteId=...
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ url, locals }) {
  const userId = requireUser(locals);
  const db = await getDb();
  const result = await db.collection('notes').deleteOne({ _id: oid(url.searchParams.get('noteId')), userId });
  if (result.deletedCount === 0) error(404, 'Note not found');
  return json({ success: true });
}
