// @ts-nocheck
import { ObjectId } from 'mongodb';
import { ItemModel } from './EntityModel.js';

/**
 * Create a new item
 * @param {string} gameId
 * @param {object} item
 */
export async function addItem(gameId, item) {
  return await ItemModel.create({
    ...item,
    gameId: new ObjectId(gameId)
  });
}

/**
 * Remove an item from a scene
 * @param {string} sceneId
 * @param {string} itemId
 */
export async function RemoveItemFromScene(sceneId, itemId) {
  const { getDb } = await import('../db.js');
  const db = await getDb();
  await db.collection('scenes').updateOne(
    { _id: new ObjectId(sceneId) }, 
    { $pull: { itemIds: new ObjectId(itemId) } }
  );
  await db.collection('items').updateOne(
    { _id: new ObjectId(itemId) }, 
    { $set: { sceneId: null } }
  );
}

/**
 * Place an item in a scene (use EntityModel relationship system)
 * @param {string} itemId
 * @param {string} sceneId
 */
export async function ItemInScene(itemId, sceneId) {
  return await ItemModel.executeRelationship('item_in_scene', {
    itemId,
    sceneId
  });
}
