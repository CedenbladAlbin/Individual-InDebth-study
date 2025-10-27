// @ts-nocheck
import { ObjectId } from 'mongodb';
import { PlayerModel } from './EntityModel.js';

/**
 * Create a new player
 * @param {string} gameId
 * @param {object} player
 */
export async function addPlayer(gameId, player) {
  return await PlayerModel.create({
    ...player,
    gameId: new ObjectId(gameId)
  });
}

/**
 * Get all players for a game
 * @param {string} gameId
 */
export async function getPlayers(gameId) {
  return await PlayerModel.findByGameId(gameId);
}

/**
 * Make a player own an item (use EntityModel relationship system)
 * @param {string} playerId
 * @param {string} itemId
 */
export async function PlayerOwnsItem(playerId, itemId) {
  return await PlayerModel.executeRelationship('player_owns_item', {
    playerId,
    itemId
  });
}

/**
 * Remove an item from a player
 * @param {string} playerId
 * @param {string} itemId
 */
export async function RemoveItemFromPlayer(playerId, itemId) {
  const { getDb } = await import('../db.js');
  const db = await getDb();
  await db.collection('players').updateOne(
    { _id: new ObjectId(playerId) }, 
    { $pull: { itemIds: new ObjectId(itemId) } }
  );
  await db.collection('items').updateOne(
    { _id: new ObjectId(itemId) }, 
    { $set: { ownerPlayerId: null } }
  );
}

/**
 * Add item to player's inventory (without changing item ownership)
 * @param {string} playerId
 * @param {string} itemId
 */
export async function PlayerHasItem(playerId, itemId) {
  return await PlayerModel.updateById(playerId, {
    $addToSet: { itemIds: new ObjectId(itemId) }
  });
}

