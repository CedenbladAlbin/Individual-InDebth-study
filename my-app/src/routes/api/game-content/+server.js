/**
 * Delete a content item (item, npc, player, scene) by id and type
 * Expects query: ?type=item|npc|player|scene&id=...
 * @param {{ url: URL, request: Request }} param0
 */
export async function DELETE({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (!type || !id) return new Response('Missing type or id', { status: 400 });
  let collection = '';
  if (type === 'npc') collection = 'npcs';
  else if (type === 'player') collection = 'players';
  else if (type === 'item') collection = 'items';
  else if (type === 'scene') collection = 'scenes';
  else return new Response('Invalid type', { status: 400 });
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const result = await db.collection(collection).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 1) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } else {
    return new Response('Not found', { status: 404 });
  }
}
/**
 * Fetch all content for a game by type (npc, player, item, scene)
 * Query: ?npc=1&gameId=... or ?player=1&gameId=... etc
 * @param {{ url: URL, request: Request }} param0
 */
export async function GET({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const gameId = url.searchParams.get('gameId');
  if (!gameId) return new Response('Missing gameId', { status: 400 });
  const db = await getDb();
  let type = '';
  if (url.searchParams.has('npc')) type = 'npc';
  else if (url.searchParams.has('player')) type = 'player';
  else if (url.searchParams.has('item')) type = 'item';
  else if (url.searchParams.has('scene')) type = 'scene';
  else return new Response('Missing type', { status: 400 });
  let collection = '';
  if (type === 'npc') collection = 'npcs';
  else if (type === 'player') collection = 'players';
  else if (type === 'item') collection = 'items';
  else if (type === 'scene') collection = 'scenes';
  const docs = await db.collection(collection).find({ gameId }).toArray();
  return new Response(JSON.stringify(docs), { status: 200 });
}

import { getDb } from '$lib/db';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

/**
 * @param {Request} request
 */
function getUserIdFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const user = jwt.verify(token, import.meta.env.VITE_JWT_SECRET || 'changeme');
    return (user && typeof user === 'object' && 'id' in user) ? user.id : null;
  } catch {
    return null;
  }
}

/**
 * Create content (item, npc, player, scene) and connect to game and optionally to other content.
 * Expects body: { type, gameId, data, connections }
 * type: 'item' | 'npc' | 'player' | 'scene'
 * data: object with content fields
 * connections: { sceneId?, npcIds?, playerIds?, itemIds?, killedByPlayerId?, givenToPlayerId? }
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { type, gameId, data, connections = {} } = await request.json();
  if (!type || !gameId || !data) return new Response('Missing fields', { status: 400 });
  const db = await getDb();
  let result;
  if (type === 'scene') {
    result = await db.collection('scenes').insertOne({ ...data, gameId });
  } else if (type === 'npc') {
    result = await db.collection('npcs').insertOne({ ...data, gameId, sceneId: connections.sceneId, itemIds: connections.itemIds || [], killedByPlayerId: connections.killedByPlayerId || null });
  } else if (type === 'player') {
    result = await db.collection('players').insertOne({ ...data, gameId, itemIds: connections.itemIds || [] });
  } else if (type === 'item') {
    result = await db.collection('items').insertOne({ ...data, gameId, ownerNpcId: connections.npcId || null, ownerPlayerId: connections.playerId || null });
  } else {
    return new Response('Invalid type', { status: 400 });
  }
  // Optionally update relationships
  if (type === 'npc' && connections.itemIds?.length) {
    await db.collection('items').updateMany({ _id: { $in: connections.itemIds.map(/** @param {string} id */ (id) => new ObjectId(id)) } }, { $set: { ownerNpcId: result.insertedId } });
  }
  if (type === 'player' && connections.itemIds?.length) {
    await db.collection('items').updateMany({ _id: { $in: connections.itemIds.map(/** @param {string} id */ (id) => new ObjectId(id)) } }, { $set: { ownerPlayerId: result.insertedId } });
  }
  if (type === 'item' && connections.playerId) {
    await db.collection('players').updateOne({ _id: new ObjectId(connections.playerId) }, { $addToSet: { itemIds: result.insertedId } });
  }
  if (type === 'item' && connections.npcId) {
    await db.collection('npcs').updateOne({ _id: new ObjectId(connections.npcId) }, { $addToSet: { itemIds: result.insertedId } });
  }
  if (type === 'npc' && connections.killedByPlayerId) {
    await db.collection('npcs').updateOne({ _id: result.insertedId }, { $set: { killedByPlayerId: connections.killedByPlayerId } });
  }
  return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
}
