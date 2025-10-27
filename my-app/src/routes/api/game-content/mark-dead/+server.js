import { NpcKilledByPlayer } from '$lib/models/npc.js';
import { json } from '@sveltejs/kit';

/**
 * Mark an NPC as dead (optionally by a player)
 * POST with JSON: { npcId, playerId }
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const { npcId, playerId } = await request.json();
  if (!npcId) return new Response('Missing npcId', { status: 400 });
  
  try {
    await NpcKilledByPlayer(npcId, playerId);
    return json({ success: true });
  } catch (e) {
    console.error('Failed to mark NPC dead:', e);
    return new Response('Failed to mark NPC dead', { status: 500 });
  }
}
