import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { requireUser, requireSession, readJson, str } from '$lib/server/access.js';
import { sanitizeNotes, parseSessionDate } from '$lib/server/sessions.js';

/**
 * PATCH /api/sessions/[id]
 * body: { title?, date? (YYYY-MM-DD or null), isEnded?, notes? } — only the given fields are changed.
 * @type {import('./$types').RequestHandler}
 */
export async function PATCH({ params, request, locals }) {
  const userId = requireUser(locals);
  const session = await requireSession(params.id, userId);
  const body = await readJson(request);

  /** @type {Record<string, any>} */
  const update = {};
  if ('title' in body) {
    const title = str(body.title, 200).trim();
    if (!title) error(400, 'Title cannot be empty');
    update.title = title;
  }
  if ('date' in body) update.date = parseSessionDate(body.date);
  if ('isEnded' in body) update.isEnded = !!body.isEnded;
  if (body.notes && typeof body.notes === 'object') {
    for (const [key, value] of Object.entries(sanitizeNotes(body.notes, true))) {
      update[`notes.${key}`] = value;
    }
  }
  if (Object.keys(update).length === 0) error(400, 'No fields to update');
  update.updatedAt = new Date();

  const db = await getDb();
  await db.collection('sessions').updateOne({ _id: session._id }, { $set: update });
  return json({ success: true });
}

/**
 * DELETE /api/sessions/[id]
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ params, locals }) {
  const userId = requireUser(locals);
  const session = await requireSession(params.id, userId);
  const db = await getDb();
  await db.collection('sessions').deleteOne({ _id: session._id });
  return json({ success: true });
}
