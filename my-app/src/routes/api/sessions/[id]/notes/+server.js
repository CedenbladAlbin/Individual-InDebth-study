import { getDb } from '$lib/db';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

/**
 * POST /api/sessions/[id]/notes
 * Add a new note to the session's notes.custom (append or replace)
 * Expects JSON body: { note: string }
 */
/**
 * @param {{ params: { id: string }, request: Request }} context
 */
export async function POST({ params, request }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return new Response('Unauthorized', { status: 401 });
    const sessionId = params.id;
    if (!sessionId) return new Response('Missing sessionId', { status: 400 });
    const db = await getDb();
    const { note } = await request.json();
    if (!note) return new Response('Missing note', { status: 400 });
    // Append to notes.custom (as array or string)
    const session = await db.collection('sessions').findOne({ _id: new ObjectId(sessionId), userId });
    if (!session) return new Response('Session not found', { status: 404 });
    let custom = session.notes?.custom || '';
    if (Array.isArray(custom)) {
      custom.push(note);
    } else if (typeof custom === 'string' && custom.length > 0) {
      custom = [custom, note];
    } else {
      custom = [note];
    }
    await db.collection('sessions').updateOne(
      { _id: new ObjectId(sessionId), userId },
      { $set: { 'notes.custom': custom } }
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('POST /api/sessions/[id]/notes error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * @param {Request} request
 */
/**
 * @param {Request} request
 */
function getUserIdFromRequest(request) {
  if (!request.headers || typeof request.headers.get !== 'function') {
    console.error('Request object does not have headers:', request);
    return null;
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const user = jwt.verify(token, import.meta.env.VITE_JWT_SECRET || 'changeme');
    if (user && typeof user === 'object') {
      return user.id || user.userId || null;
    }
    return null;
  } catch {
    return null;
  }
}
