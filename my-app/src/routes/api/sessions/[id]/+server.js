import { getDb } from '$lib/db';
import { request } from 'https';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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
    return (user && typeof user === 'object' && 'id' in user) ? user.id : null;
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
