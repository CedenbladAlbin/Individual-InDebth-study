// @ts-nocheck
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';

export async function addPlayer(gameId, player) {
  const db = await getDb();
  player.gameId = new ObjectId(gameId);
  return db.collection('players').insertOne(player);
}

export async function getPlayers(gameId) {
  const db = await getDb();
  return db.collection('players').find({ gameId: new ObjectId(gameId) }).toArray();
}

export async function PlayerOwnsItem(playerId, itemId) {
  const db = await getDb();
  await db.collection('players').updateOne({ _id: new ObjectId(playerId) }, { $addToSet: { itemIds: new ObjectId(itemId) } });
  await db.collection('items').updateOne({ _id: new ObjectId(itemId) }, { $set: { ownerPlayerId: new ObjectId(playerId), ownerNpcId: null } });
}

export async function RemoveItemFromPlayer(playerId, itemId) {
  const db = await getDb();
  await db.collection('players').updateOne({ _id: new ObjectId(playerId) }, { $pull: { itemIds: new ObjectId(itemId) } });
  await db.collection('items').updateOne({ _id: new ObjectId(itemId) }, { $set: { ownerPlayerId: null } });
}

export async function PlayerHasItem(playerId, itemId) {
  const db = await getDb();
  await db.collection('players').updateOne({ _id: new ObjectId(playerId) }, { $addToSet: { itemIds: new ObjectId(itemId) } });
}

