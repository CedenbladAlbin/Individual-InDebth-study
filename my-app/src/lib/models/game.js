// @ts-nocheck
import { ObjectId } from 'mongodb';
import { GameModel, NpcModel, PlayerModel, ItemModel, NoteModel } from './EntityModel.js';

/**
 * Create a new game
 * @param {string} ownerId
 * @param {string} name
 * @param {string} description
 **/
export async function createGame(ownerId, name, description) {
  return await GameModel.create({
    ownerId,
    name,
    description: description || ''
  });
}

/**
 * Get all games for a user
 * @param {string} ownerId
 */
export async function getUserGames(ownerId) {
  return await GameModel.find({ ownerId });
}

/**
 * Get a single game by ID and owner
 * @param {string} gameId
 * @param {string} ownerId
 */
export async function getGame(gameId, ownerId) {
  return await GameModel.findOne({ _id: new ObjectId(gameId), ownerId });
}

/**
 * Get complete game data with all related entities
 * @param {string} gameId
 * @param {string} ownerId
 */
export async function getGameData(gameId, ownerId) {
  const game = await getGame(gameId, ownerId);
  if (!game) return null;

  const [npcs, players, items, notes] = await Promise.all([
    NpcModel.findByGameId(gameId),
    PlayerModel.findByGameId(gameId),
    ItemModel.findByGameId(gameId),
    NoteModel.findByGameId(gameId)
  ]);

  return { ...game, npcs, players, items, notes };
}
