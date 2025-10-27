// @ts-nocheck
import { ObjectId } from 'mongodb';
import { NpcModel } from './EntityModel.js';

/**
 * Create a new NPC
 * @param {string} gameId
 * @param {object} npc
 */
export async function addNpc(gameId, npc) {
  return await NpcModel.create({
    ...npc,
    gameId: new ObjectId(gameId)
  });
}

/**
 * Remove an item from an NPC
 * @param {string} npcId
 * @param {string} itemId
 */
export async function RemoveItemFromNpc(npcId, itemId) {
  const { getDb } = await import('../db.js');
  const db = await getDb();
  await db.collection('npcs').updateOne(
    { _id: new ObjectId(npcId) }, 
    { $pull: { itemIds: new ObjectId(itemId) } }
  );
  await db.collection('items').updateOne(
    { _id: new ObjectId(itemId) }, 
    { $set: { ownerNpcId: null } }
  );
}

/**
 * Remove NPC from scene
 * @param {string} npcId
 */
export async function RemoveNpcFromScene(npcId) {
  return await NpcModel.updateById(npcId, { sceneId: null });
}

/**
 * Make an NPC own an item (use EntityModel relationship system)
 * @param {string} npcId
 * @param {string} itemId
 */
export async function NpcOwnsItem(npcId, itemId) {
  return await NpcModel.executeRelationship('npc_owns_item', {
    npcId,
    itemId
  });
}

/**
 * Place an NPC in a scene (use EntityModel relationship system)
 * @param {string} npcId
 * @param {string} sceneId
 */
export async function NpcExistsInScene(npcId, sceneId) {
  return await NpcModel.executeRelationship('npc_in_scene', {
    npcId,
    sceneId
  });
}

/**
 * Mark NPC as killed by a player
 * @param {string} npcId
 * @param {string} playerId
 */
export async function NpcKilledByPlayer(npcId, playerId) {
  return await NpcModel.updateById(npcId, {
    killedByPlayerId: new ObjectId(playerId)
  });
}

/**
 * Add item to NPC's inventory (without changing ownership)
 * @param {string} npcId
 * @param {string} itemId
 */
export async function NpcHasItem(npcId, itemId) {
  const { getDb } = await import('../db.js');
  const db = await getDb();
  await db.collection('npcs').updateOne(
    { _id: new ObjectId(npcId) }, 
    { $addToSet: { itemIds: new ObjectId(itemId) } }
  );
}
