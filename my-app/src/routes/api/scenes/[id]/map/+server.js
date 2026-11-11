import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { requireUser, requireEntity, readJson } from '$lib/server/access.js';
import { sanitizeMapState } from '$lib/server/map.js';

/**
 * GET /api/scenes/[id]/map — the saved battle map state, or { state: null } if none yet.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ params, locals }) {
  const userId = requireUser(locals);
  const scene = await requireEntity('scene', params.id, userId);
  const db = await getDb();
  const doc = await db.collection('sceneMaps').findOne({ sceneId: scene._id });
  return json({ state: doc ? sanitizeMapState(doc.state) : null, updatedAt: doc?.updatedAt ?? null });
}

/**
 * PUT /api/scenes/[id]/map — replace the battle map state.
 * body: { state }
 * @type {import('./$types').RequestHandler}
 */
export async function PUT({ params, request, locals }) {
  const userId = requireUser(locals);
  const scene = await requireEntity('scene', params.id, userId);
  const { state } = await readJson(request);
  const clean = sanitizeMapState(state);
  const updatedAt = new Date();
  const db = await getDb();
  await db.collection('sceneMaps').updateOne(
    { sceneId: scene._id },
    { $set: { sceneId: scene._id, gameId: String(scene.gameId), state: clean, updatedAt } },
    { upsert: true }
  );
  return json({ success: true, updatedAt });
}
