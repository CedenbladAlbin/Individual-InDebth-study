import { getDb } from '$lib/db';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

/**
 * @param {Request} request
 */
function getUserIdFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const user = jwt.verify(token, import.meta.env.VITE_JWT_SECRET || 'changeme');
    return (user && typeof user === 'object' && 'id' in user) ? user.id : null;
  } catch {
    return null;
  }
}

// GET: /api/game-content/notes?type=npc&entityId=123
/**
 * @param {{ url: URL, request: Request }} param0
 */
export async function GET({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const type = url.searchParams.get('type');
  const entityId = url.searchParams.get('entityId');
  if (!type || !entityId) return new Response('Missing type or entityId', { status: 400 });
  const db = await getDb();
  const notes = await db.collection('notes').find({ type, entityId }).toArray();
  return new Response(JSON.stringify(notes), { status: 200 });
}

// POST: create note
/**
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { type, entityId, title, text } = await request.json();
  if (!type || !entityId || !title || !text) return new Response('Missing fields', { status: 400 });
  const db = await getDb();
  await db.collection('notes').insertOne({ type, entityId, title, text, userId });
  const notes = await db.collection('notes').find({ type, entityId }).toArray();
  return new Response(JSON.stringify(notes), { status: 201 });
}

// PUT: update note
/**
 * @param {{ request: Request }} param0
 */
export async function PUT({ request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { noteId, title, text } = await request.json();
  if (!noteId || !title || !text) return new Response('Missing fields', { status: 400 });
  const db = await getDb();
  await db.collection('notes').updateOne({ _id: new ObjectId(noteId), userId }, { $set: { title, text } });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

// DELETE: delete note
/**
 * @param {{ url: URL, request: Request }} param0
 */
export async function DELETE({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const noteId = url.searchParams.get('noteId');
  if (!noteId) return new Response('Missing noteId', { status: 400 });
  const db = await getDb();
  await db.collection('notes').deleteOne({ _id: new ObjectId(noteId), userId });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
