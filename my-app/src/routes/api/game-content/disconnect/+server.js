import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { requireUser, requireEntity, readJson } from '$lib/server/access.js';
import { detachItem } from '$lib/server/content.js';

/**
 * POST /api/game-content/disconnect
 * body: { type: 'item-player' | 'item-npc' | 'item-scene' | 'npc-scene', fromId }
 * fromId is the item (item-*) or the NPC (npc-scene).
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
  const userId = requireUser(locals);
  const { type, fromId } = await readJson(request);
  const db = await getDb();

  if (type === 'item-player' || type === 'item-npc' || type === 'item-scene') {
    await detachItem(db, await requireEntity('item', fromId, userId));
  } else if (type === 'npc-scene') {
    const npc = await requireEntity('npc', fromId, userId);
    await db.collection('npcs').updateOne({ _id: npc._id }, { $set: { sceneId: null } });
  } else {
    error(400, 'Invalid type');
  }
  return json({ success: true });
}
