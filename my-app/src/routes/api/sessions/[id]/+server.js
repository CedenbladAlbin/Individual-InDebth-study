/**
 * PATCH /api/sessions/[id]
 * Allows updating session fields: mark ended, update notes, add custom notes, etc.
 * Expects JSON body: { isEnded?, notes?, customNote? }
 * @param {{ params: { id: string }, request: Request }} param0
 */
export async function PATCH({ params, request }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return new Response('Unauthorized', { status: 401 });
    const sessionId = params.id;
    if (!sessionId) return new Response('Missing sessionId', { status: 400 });
    const db = await getDb();
    /** @type {Record<string, any>} */
    const update = {};
    const body = await request.json();
    if ('isEnded' in body) update.isEnded = !!body.isEnded;
    if ('notes' in body) {
      for (const [k, v] of Object.entries(body.notes)) {
        update[`notes.${k}`] = v;
      }
    }
    if ('customNote' in body) {
      update['notes.custom'] = body.customNote;
    }
    if (Object.keys(update).length === 0) return new Response('No fields to update', { status: 400 });
    const result = await db.collection('sessions').updateOne(
      { _id: new ObjectId(sessionId), userId },
      { $set: update }
    );
    if (result.matchedCount === 1) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response('Session not found or not authorized', { status: 404 });
    }
  } catch (err) {
    console.error('PATCH /api/sessions/[id] error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * POST /api/sessions/[id]/notes
 * Add a new note to the session's notes.custom (append or replace)
 * Expects JSON body: { note: string }
 */
// @ts-ignore
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
import { getDb } from '$lib/db';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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


/**
 * DELETE /api/sessions/[id]
 * @param {{ params: { id: string }, request: Request }} param0
 */

export async function DELETE({ params, request }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return new Response('Unauthorized', { status: 401 });
    const sessionId = params.id;
    if (!sessionId) return new Response('Missing sessionId', { status: 400 });
    const db = await getDb();
    const result = await db.collection('sessions').deleteOne({ _id: new ObjectId(sessionId), userId });
    if (result.deletedCount === 1) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response('Session not found or not authorized', { status: 404 });
    }
  } catch (err) {
    console.error('DELETE /api/sessions/[id] error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
