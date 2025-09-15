// @ts-nocheck
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';

export async function addNpc(gameId, npc) {
  const db = await getDb();
  npc.gameId = new ObjectId(gameId);
  return db.collection('npcs').insertOne(npc);
}

export async function RemoveItemFromNpc(npcId, itemId) {
  const db = await getDb();
  await db.collection('npcs').updateOne({ _id: new ObjectId(npcId) }, { $pull: { itemIds: new ObjectId(itemId) } });
  await db.collection('items').updateOne({ _id: new ObjectId(itemId) }, { $set: { ownerNpcId: null } });
}

export async function RemoveNpcFromScene(npcId) {
  const db = await getDb();
  await db.collection('npcs').updateOne({ _id: new ObjectId(npcId) }, { $set: { sceneId: null } });
}

export async function NpcOwnsItem(npcId, itemId) {
  const db = await getDb();
  await db.collection('npcs').updateOne({ _id: new ObjectId(npcId) }, { $addToSet: { itemIds: new ObjectId(itemId) } });
  await db.collection('items').updateOne({ _id: new ObjectId(itemId) }, { $set: { ownerNpcId: new ObjectId(npcId), ownerPlayerId: null } });
}

export async function NpcExistsInScene(npcId, sceneId) {
  const db = await getDb();
  await db.collection('npcs').updateOne({ _id: new ObjectId(npcId) }, { $set: { sceneId: new ObjectId(sceneId) } });
}

export async function NpcKilledByPlayer(npcId, playerId) {
  const db = await getDb();
  await db.collection('npcs').updateOne({ _id: new ObjectId(npcId) }, { $set: { killedByPlayerId: new ObjectId(playerId) } });
}

export async function NpcHasItem(npcId, itemId) {
  const db = await getDb();
  await db.collection('npcs').updateOne({ _id: new ObjectId(npcId) }, { $addToSet: { itemIds: new ObjectId(itemId) } });
}
