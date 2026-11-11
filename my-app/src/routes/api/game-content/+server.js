import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { COLLECTIONS, isEntityType, requireUser, requireGame, requireEntity, readJson, str } from '$lib/server/access.js';
import { ALLOWED_FIELDS, FIELD_MAX, DEFAULT_LINKS, deleteEntity } from '$lib/server/content.js';

/**
 * GET /api/game-content?<type>=1&gameId=...  (type: npc | player | item | scene)
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url, locals }) {
  const userId = requireUser(locals);
  const gameId = url.searchParams.get('gameId');
  await requireGame(gameId, userId);
  const type = Object.keys(COLLECTIONS).find((t) => url.searchParams.has(t));
  if (!isEntityType(type)) error(400, 'Missing type');
  const db = await getDb();
  // Scene images are large base64 blobs; they're served separately by /api/scenes/[id]/image
  const options = type === 'scene' ? { projection: { image: 0 } } : {};
  return json(await db.collection(COLLECTIONS[type]).find({ gameId }, options).toArray());
}

/**
 * POST /api/game-content  body: { type, gameId, data }
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, locals }) {
  const userId = requireUser(locals);
  const { type, gameId, data } = await readJson(request);
  if (!isEntityType(type)) error(400, 'Invalid type');
  if (!data || typeof data !== 'object') error(400, 'Missing data');
  await requireGame(gameId, userId);

  /** @type {Record<string, string>} */
  const fields = {};
  for (const key of ALLOWED_FIELDS[type]) fields[key] = str(data[key], FIELD_MAX[key] ?? 10000).trim();
  if (!fields.name.trim()) error(400, 'Name is required');

  const db = await getDb();
  const result = await db.collection(COLLECTIONS[type]).insertOne({
    ...fields,
    ...structuredClone(DEFAULT_LINKS[type]),
    gameId: String(gameId),
    createdAt: new Date()
  });
  return json({ success: true, id: result.insertedId }, { status: 201 });
}

/**
 * DELETE /api/game-content?type=...&id=...
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ url, locals }) {
  const userId = requireUser(locals);
  const type = url.searchParams.get('type');
  const entity = await requireEntity(type, url.searchParams.get('id'), userId);
  const db = await getDb();
  await deleteEntity(db, /** @type {any} */ (type), entity);
  return json({ success: true });
}

/**
 * PATCH /api/game-content — edit one or many entities of the same type.
 * body: { type, ids: string[] (max 500), data: { name?, description?, group?, ...type fields } }
 * Only the fields present in `data` are changed.
 * @type {import('./$types').RequestHandler}
 */
export async function PATCH({ request, locals }) {
  const userId = requireUser(locals);
  const { type, ids, data } = await readJson(request);
  if (!isEntityType(type)) error(400, 'Invalid type');
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) error(400, 'ids must be a non-empty array (max 500)');
  if (!data || typeof data !== 'object') error(400, 'Missing data');

  /** @type {Record<string, string>} */
  const set = {};
  for (const key of ALLOWED_FIELDS[type]) {
    if (key in data) set[key] = str(data[key], FIELD_MAX[key] ?? 10000).trim();
  }
  if ('name' in set && !set.name) error(400, 'Name cannot be empty');
  if (Object.keys(set).length === 0) error(400, 'No editable fields given');

  // Every id must belong to one of the user's games
  const entities = [];
  for (const id of new Set(ids)) entities.push(await requireEntity(type, id, userId));

  const db = await getDb();
  const result = await db.collection(COLLECTIONS[type]).updateMany(
    { _id: { $in: entities.map((e) => e._id) } },
    { $set: { ...set, updatedAt: new Date() } }
  );
  return json({ success: true, updated: result.modifiedCount });
}
