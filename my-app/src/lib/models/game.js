// @ts-nocheck
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';

/**
 * Create a new game
 * @param {string} ownerId
 * @param {string} name
 * @param {string} description
 **/

export async function createGame(ownerId, name, description) {
  const db = await getDb();
  const result = await db.collection('games').insertOne({
    ownerId,
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return result.insertedId;
}

// @ts-ignore
export async function getUserGames(ownerId) {
  const db = await getDb();
  return db.collection('games').find({ ownerId }).toArray();
}

// @ts-ignore
export async function getGame(gameId, ownerId) {
  const db = await getDb();
  return db.collection('games').findOne({ _id: new ObjectId(gameId), ownerId });
}

// @ts-ignore
export async function getGameData(gameId, ownerId) {
  const db = await getDb();
  const game = await db.collection('games').findOne({ _id: new ObjectId(gameId), ownerId });
  if (!game) return null;
  const [npcs, players, items, notes] = await Promise.all([
    db.collection('npcs').find({ gameId: new ObjectId(gameId) }).toArray(),
    db.collection('players').find({ gameId: new ObjectId(gameId) }).toArray(),
    db.collection('items').find({ gameId: new ObjectId(gameId) }).toArray(),
    db.collection('notes').find({ gameId: new ObjectId(gameId) }).toArray()
  ]);
  return { ...game, npcs, players, items, notes };
}
