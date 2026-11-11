import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { requireUser, requireGame } from '$lib/server/access.js';

/**
 * GET /api/games/[id]/export — everything in one campaign (the user's own data only),
 * used to build a context pack for an external AI chat. Scene images are left out.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ params, locals }) {
  const userId = requireUser(locals);
  const game = await requireGame(params.id, userId);
  const gameId = String(game._id);
  const db = await getDb();

  const [scenes, npcs, players, items, sessions] = await Promise.all([
    db.collection('scenes').find({ gameId }, { projection: { image: 0 } }).toArray(),
    db.collection('npcs').find({ gameId }).toArray(),
    db.collection('players').find({ gameId }).toArray(),
    db.collection('items').find({ gameId }).toArray(),
    db.collection('sessions').find({ gameId, userId }).sort({ date: 1, createdAt: 1 }).toArray()
  ]);

  // Notes are stored per entity; keep only those for entities in this game
  const ids = [...scenes, ...npcs, ...players, ...items].map((e) => String(e._id));
  const notes = await db
    .collection('notes')
    .find({ userId, entityId: { $in: ids } }, { projection: { type: 1, entityId: 1, title: 1, text: 1 } })
    .toArray();

  return json({ game, scenes, npcs, players, items, sessions, notes });
}
