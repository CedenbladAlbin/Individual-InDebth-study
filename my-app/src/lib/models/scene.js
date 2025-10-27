// @ts-nocheck
import { ObjectId } from 'mongodb';
import { SceneModel } from './EntityModel.js';

/**
 * Create a new scene
 * @param {string} gameId
 * @param {object} scene
 */
export async function addScene(gameId, scene) {
  return await SceneModel.create({
    ...scene,
    gameId: new ObjectId(gameId)
  });
}

/**
 * Get all scenes for a game
 * @param {string} gameId
 */
export async function getScenes(gameId) {
  return await SceneModel.findByGameId(gameId);
}
