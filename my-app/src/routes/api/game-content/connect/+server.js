
import { PlayerOwnsItem } from '$lib/models/player.js';
import { NpcOwnsItem, NpcExistsInScene } from '$lib/models/npc.js';
import { ItemInScene } from '$lib/models/item.js';

/**
 * @param {{ request: Request }} param0
 * @returns {Promise<Response>}
 */

export async function POST({ request }) {
  const body = await request.json();
  // Item connection
  if (body.itemId && body.targetType && body.targetId) {
    try {
      if (body.targetType === 'player') {
        await PlayerOwnsItem(body.targetId, body.itemId);
      } else if (body.targetType === 'npc') {
        await NpcOwnsItem(body.targetId, body.itemId);
      } else if (body.targetType === 'scene') {
        await ItemInScene(body.itemId, body.targetId);
      } else {
        return new Response('Invalid targetType', { status: 400 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
      return new Response('Failed to connect item', { status: 500 });
    }
  }
  // NPC to Scene connection
  if (body.npcId && body.sceneId) {
    try {
      await NpcExistsInScene(body.npcId, body.sceneId);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
      return new Response('Failed to connect NPC to scene', { status: 500 });
    }
  }
  return new Response('Missing or invalid fields', { status: 400 });
}
