import { anyIdForm } from './access.js';

/** @typedef {import('mongodb').Db} Db */
/** @typedef {import('mongodb').Document} Doc */

/**
 * Fields a client may set on each content type.
 * `group` is a free-text folder (city, clan, faction, region…) used to organise long lists.
 */
export const ALLOWED_FIELDS = {
  item: ['name', 'description', 'group', 'itemType', 'benefits'],
  npc: ['name', 'description', 'group', 'role', 'status'],
  player: ['name', 'description', 'group', 'class', 'level'],
  scene: ['name', 'description', 'group', 'location', 'dangerLevel']
};

/** Max length per field; everything not listed is long-form text */
/** @type {Record<string, number>} */
export const FIELD_MAX = { name: 200, group: 60 };

/** Default relationship fields for newly created content. */
export const DEFAULT_LINKS = {
  item: { ownerPlayerId: null, ownerNpcId: null, sceneId: null },
  npc: { sceneId: null, itemIds: [], killedByPlayerId: null },
  player: { itemIds: [] },
  scene: { itemIds: [] }
};

/**
 * Remove an item from whoever currently holds it (player, NPC or scene).
 * @param {Db} db
 * @param {Doc} item
 */
export async function detachItem(db, item) {
  const ids = anyIdForm(item._id);
  /** @type {any} */
  const pull = { $pull: { itemIds: ids } };
  await Promise.all(
    ['players', 'npcs', 'scenes'].map((c) => db.collection(c).updateMany({ itemIds: ids }, pull))
  );
  await db.collection('items').updateOne(
    { _id: item._id },
    { $set: { ownerPlayerId: null, ownerNpcId: null, sceneId: null } }
  );
}

/**
 * Move an item to a player, NPC or scene. An item has exactly one location at a time.
 * @param {Db} db
 * @param {Doc} item
 * @param {'player' | 'npc' | 'scene'} targetType
 * @param {Doc} target
 */
export async function attachItem(db, item, targetType, target) {
  await detachItem(db, item);
  const field = { player: 'ownerPlayerId', npc: 'ownerNpcId', scene: 'sceneId' }[targetType];
  const collection = { player: 'players', npc: 'npcs', scene: 'scenes' }[targetType];
  await db.collection('items').updateOne({ _id: item._id }, { $set: { [field]: target._id } });
  await db.collection(collection).updateOne({ _id: target._id }, { $addToSet: { itemIds: item._id } });
}

/**
 * Delete an entity and clear every reference to it.
 * @param {Db} db
 * @param {'npc' | 'player' | 'item' | 'scene'} type
 * @param {Doc} entity
 */
export async function deleteEntity(db, type, entity) {
  const ids = anyIdForm(entity._id);
  if (type === 'item') {
    await detachItem(db, entity);
  } else if (type === 'scene') {
    await db.collection('items').updateMany({ sceneId: ids }, { $set: { sceneId: null } });
    await db.collection('npcs').updateMany({ sceneId: ids }, { $set: { sceneId: null } });
    await db.collection('sceneMaps').deleteMany({ sceneId: entity._id });
  } else if (type === 'npc') {
    await db.collection('items').updateMany({ ownerNpcId: ids }, { $set: { ownerNpcId: null } });
  } else if (type === 'player') {
    await db.collection('items').updateMany({ ownerPlayerId: ids }, { $set: { ownerPlayerId: null } });
    await db.collection('npcs').updateMany({ killedByPlayerId: ids }, { $set: { killedByPlayerId: null } });
  }
  await db.collection('notes').deleteMany({ type, entityId: entity._id.toHexString() });
  const collection = { npc: 'npcs', player: 'players', item: 'items', scene: 'scenes' }[type];
  await db.collection(collection).deleteOne({ _id: entity._id });
}
