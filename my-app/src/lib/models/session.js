// @ts-nocheck
import { ObjectId } from 'mongodb';
import { SessionModel } from './EntityModel.js';

/**
 * Create a new session
 * @param {string} userId 
 * @param {string} gameId 
 * @param {string} title 
 * @param {object} notes 
 * @param {object} connections 
 * @param {boolean} isEnded 
 */
export async function createSession(userId, gameId, title, notes = {}, connections = {}, isEnded = false) {
  const sessionData = {
    gameId,
    userId,
    title,
    isEnded: !!isEnded,
    notes: {
      summary: notes.summary || '',
      plotDevelopments: notes.plotDevelopments || '',
      quests: notes.quests || '',
      loot: notes.loot || '',
      xp: notes.xp || 0,
      secrets: notes.secrets || '',
      factions: notes.factions || '',
      mysteries: notes.mysteries || '',
      goals: notes.goals || '',
      downtime: notes.downtime || '',
      nextPlans: notes.nextPlans || '',
      custom: notes.custom || ''
    },
    connections: {
      npcs: connections.npcs || [],
      items: connections.items || [],
      scenes: connections.scenes || [],
      players: connections.players || [],
      quests: connections.quests || []
    }
  };
  
  return await SessionModel.create(sessionData);
}

/**
 * Update existing session
 * @param {string} sessionId 
 * @param {string} userId 
 * @param {object} updateData 
 */
export async function updateSession(sessionId, userId, updateData) {
  const { getDb } = await import('../db.js');
  const db = await getDb();
  
  const result = await db.collection('sessions').updateOne(
    { _id: new ObjectId(sessionId), userId },
    { $set: { ...updateData, updatedAt: new Date() } }
  );
  
  return result.matchedCount > 0;
}

/**
 * Get sessions by game ID
 * @param {string} gameId 
 * @param {string} userId 
 */
export async function getSessionsByGame(gameId, userId) {
  const { getDb } = await import('../db.js');
  const db = await getDb();
  return await db.collection('sessions')
    .find({ gameId, userId })
    .sort({ createdAt: 1 })
    .toArray();
}

/**
 * Get single session
 * @param {string} sessionId 
 * @param {string} userId 
 */
export async function getSession(sessionId, userId) {
  return await SessionModel.findOne({ 
    _id: new ObjectId(sessionId), 
    userId 
  });
}

/**
 * Delete session
 * @param {string} sessionId 
 * @param {string} userId 
 */
export async function deleteSession(sessionId, userId) {
  const { getDb } = await import('../db.js');
  const db = await getDb();
  const result = await db.collection('sessions').deleteOne({ 
    _id: new ObjectId(sessionId), 
    userId 
  });
  return result.deletedCount > 0;
}