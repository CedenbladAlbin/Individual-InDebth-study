// MongoDB models for the app
import { ObjectId } from 'mongodb';
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
  return db.collection('games').find({ ownerId }).toArray();
}

/**
 * @param {string} gameId
 * @param {string} ownerId
 */
export async function getGame(gameId, ownerId) {
  const db = await getDb();
  return db.collection('games').findOne({ _id: new ObjectId(gameId), ownerId });
}

/**
 * @param {string} gameId
 * @param {object} npc
 */
export async function addNpc(gameId, npc) {
  const db = await getDb();
  // @ts-ignore
  npc.gameId = new ObjectId(gameId);
  return db.collection('npcs').insertOne(npc);
}

/**
 * @param {string} gameId
 * @param {object} player
 */
export async function addPlayer(gameId, player) {
  const db = await getDb();
  // @ts-ignore
  player.gameId = new ObjectId(gameId);
  return db.collection('players').insertOne(player);
}

/**
 * @param {string} gameId
 * @param {object} item
 */
export async function addItem(gameId, item) {
  const db = await getDb();
  // @ts-ignore
  item.gameId = new ObjectId(gameId);
  return db.collection('items').insertOne(item);
}

/**
 * @param {string} gameId
 * @param {object} note
 */
export async function addNote(gameId, note) {
  const db = await getDb();
  // @ts-ignore
  note.gameId = new ObjectId(gameId);
  // @ts-ignore
  note.createdAt = new Date();
  return db.collection('notes').insertOne(note);
}

/**
 * @param {string} gameId
 * @param {string} ownerId
 */
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
