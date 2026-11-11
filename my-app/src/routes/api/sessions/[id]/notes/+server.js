import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { requireUser, requireSession, readJson, str } from '$lib/server/access.js';

/**
 * POST /api/sessions/[id]/notes — append a note to the session's notes.custom list.
 * body: { note: string }
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ params, request, locals }) {
  const userId = requireUser(locals);
  const session = await requireSession(params.id, userId);
  const note = str((await readJson(request)).note).trim();
  if (!note) error(400, 'Missing note');

  // notes.custom used to be a plain string; convert it to a list on first append
  const existing = session.notes?.custom;
  const custom = Array.isArray(existing) ? [...existing, note] : existing ? [String(existing), note] : [note];

  const db = await getDb();
  await db.collection('sessions').updateOne(
    { _id: session._id },
    { $set: { 'notes.custom': custom, updatedAt: new Date() } }
  );
  return json({ success: true, custom });
}
