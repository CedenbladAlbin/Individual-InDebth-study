import { RemoveItemFromPlayer } from '$lib/models/player.js';
import { RemoveItemFromNpc, RemoveNpcFromScene } from '$lib/models/npc.js';
import { RemoveItemFromScene } from '$lib/models/item.js';

/**
 * Remove a connection between entities (item/player/npc/scene)
 * POST with JSON: { type, fromId, toId }
 */

/** @param {{ request: Request }} param0
 * @returns {Promise<Response>}
 */
export async function POST({ request }) {
  const body = await request.json();
  try {
    if (body.type === 'item-player') {
      await RemoveItemFromPlayer(body.toId, body.fromId); // fromId = item, toId = player
    } else if (body.type === 'item-npc') {
      await RemoveItemFromNpc(body.toId, body.fromId); // fromId = item, toId = npc
    } else if (body.type === 'item-scene') {
      await RemoveItemFromScene(body.toId, body.fromId); // fromId = item, toId = scene
    } else if (body.type === 'npc-scene') {
      await RemoveNpcFromScene(body.fromId); // fromId = npc
    } else {
      return new Response('Invalid type', { status: 400 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response('Failed to remove connection', { status: 500 });
  }
}
