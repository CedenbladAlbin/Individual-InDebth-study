import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { oid, requireUser, requireGame, readJson, str } from '$lib/server/access.js';
import { sanitizeNotes, sanitizeConnections, parseSessionDate } from '$lib/server/sessions.js';

/**
 * POST /api/sessions — create a session, or update it when sessionId is given.
 * body: { gameId, title, sessionId?, date? (YYYY-MM-DD), isEnded?, notes?, connections? }
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
  const userId = requireUser(locals);
  const { gameId, title, sessionId, date, isEnded, notes, connections } = await readJson(request);
  if (!str(title).trim()) error(400, 'Title is required');
  await requireGame(gameId, userId);

  const db = await getDb();
  const sessionDoc = {
    gameId: String(gameId),
    userId,
    title: str(title, 200).trim(),
    date: parseSessionDate(date),
    isEnded: !!isEnded,
    notes: sanitizeNotes(notes),
    connections: sanitizeConnections(connections),
    updatedAt: new Date()
  };

  if (sessionId) {
    const result = await db.collection('sessions').updateOne(
      { _id: oid(sessionId), gameId: sessionDoc.gameId, userId },
      { $set: sessionDoc }
    );
    if (result.matchedCount === 0) error(404, 'Session not found');
    return json({ success: true });
  }
  const result = await db.collection('sessions').insertOne({ ...sessionDoc, createdAt: new Date() });
  return json({ success: true, id: result.insertedId }, { status: 201 });
}

/**
 * GET /api/sessions?gameId=...
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url, locals }) {
  const userId = requireUser(locals);
  const gameId = url.searchParams.get('gameId');
  await requireGame(gameId, userId);
  const db = await getDb();
  return json(await db.collection('sessions').find({ gameId, userId }).sort({ date: 1, createdAt: 1 }).toArray());
}
