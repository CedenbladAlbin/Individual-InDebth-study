// @ts-nocheck
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';

export async function addItem(gameId, item) {
  const db = await getDb();
  item.gameId = new ObjectId(gameId);
  return db.collection('items').insertOne(item);
}

export async function RemoveItemFromScene(sceneId, itemId) {
  const db = await getDb();
  await db.collection('scenes').updateOne({ _id: new ObjectId(sceneId) }, { $pull: { itemIds: new ObjectId(itemId) } });
  await db.collection('items').updateOne({ _id: new ObjectId(itemId) }, { $set: { sceneId: null } });
}

export async function ItemInScene(itemId, sceneId) {
  const db = await getDb();
  await db.collection('items').updateOne({ _id: new ObjectId(itemId) }, { $set: { sceneId: new ObjectId(sceneId), ownerPlayerId: null, ownerNpcId: null } });
  await db.collection('scenes').updateOne({ _id: new ObjectId(sceneId) }, { $addToSet: { itemIds: new ObjectId(itemId) } });
}
