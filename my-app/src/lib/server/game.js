import { getDb } from './db.js';

/**
 * @param {string} ownerId
 * @param {string} name
 * @param {string} description
 */
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

/**
 * @param {string} ownerId
 */
export async function getUserGames(ownerId) {
  const db = await getDb();
  return db.collection('games').find({ ownerId }).sort({ createdAt: -1 }).toArray();
}
