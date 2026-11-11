import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { requireUser, requireEntity, readJson } from '$lib/server/access.js';
import { attachItem } from '$lib/server/content.js';

/**
 * POST /api/game-content/connect
 * body: { itemId, targetType: 'player' | 'npc' | 'scene', targetId }  — move an item
 *    or { npcId, sceneId }                                             — place an NPC in a scene
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
  const userId = requireUser(locals);
  const body = await readJson(request);
  const db = await getDb();

  if (body.itemId) {
    if (!['player', 'npc', 'scene'].includes(body.targetType)) error(400, 'Invalid targetType');
    const item = await requireEntity('item', body.itemId, userId);
    const target = await requireEntity(body.targetType, body.targetId, userId);
    if (String(item.gameId) !== String(target.gameId)) error(400, 'Entities belong to different games');
    await attachItem(db, item, body.targetType, target);
    return json({ success: true });
  }

  if (body.npcId) {
    const npc = await requireEntity('npc', body.npcId, userId);
    const scene = await requireEntity('scene', body.sceneId, userId);
    if (String(npc.gameId) !== String(scene.gameId)) error(400, 'Entities belong to different games');
    await db.collection('npcs').updateOne({ _id: npc._id }, { $set: { sceneId: scene._id } });
    return json({ success: true });
  }

  error(400, 'Missing or invalid fields');
}
