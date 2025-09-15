// DELETE: remove a session by ID
/**
 * @param {{ url: URL, request: Request }} param0
 */
export async function DELETE({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const sessionId = url.pathname.split('/').pop();
  if (!sessionId) return new Response('Missing sessionId', { status: 400 });
  const db = await getDb();
  const result = await db.collection('sessions').deleteOne({ _id: new ObjectId(sessionId), userId });
  if (result.deletedCount === 1) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } else {
    return new Response('Session not found or not authorized', { status: 404 });
  }
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

// POST: create or update a session with full DM notes and connections
/**
 * Expects: {
 *   gameId, title, sessionId?,
 *   notes: {
 *     summary, plotDevelopments, npcs, scenes, items, players, quests, actions, combats, loot, xp, status, secrets, factions, mysteries, goals, rules, roleplay, downtime, nextPlans, custom
 *   },
 *   connections: {
 *     npcs: [id], items: [id], scenes: [id], players: [id], quests: [id]
 *   },
 *   isEnded
 * }
 * All fields optional except gameId and title. Allows DM to save structured notes and connect to existing content.
 */
/**
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const {
    gameId, title, sessionId, isEnded,
    notes = {},
    connections = { npcs: [], items: [], scenes: [], players: [], quests: [] }
  } = await request.json();
  if (!gameId || !title) return new Response('Missing fields', { status: 400 });
  const db = await getDb();
  const sessionDoc = {
    gameId,
    userId,
    title,
    isEnded: !!isEnded,
    notes: {
      summary: notes.summary || '',
      plotDevelopments: notes.plotDevelopments || '',
      npcs: notes.npcs || [],
      scenes: notes.scenes || [],
      items: notes.items || [],
      players: notes.players || [],
      quests: notes.quests || [],
      loot: notes.loot || [],
      xp: notes.xp || '',
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
    },
  updatedAt: new Date()
  };
  if (sessionId) {
    await db.collection('sessions').updateOne(
      { _id: new ObjectId(sessionId), gameId },
      { $set: sessionDoc }
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } else {
    const result = await db.collection('sessions').insertOne({
      ...sessionDoc,
      createdAt: new Date()
    });
    return new Response(JSON.stringify({ success: true, id: result.insertedId }), { status: 201 });
  }
}

// GET: list all sessions for a game
/**
 * Query: ?gameId=...
 */
/**
 * @param {{ url: URL, request: Request }} param0
 */
export async function GET({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const gameId = url.searchParams.get('gameId');
  if (!gameId) return new Response('Missing gameId', { status: 400 });
  const db = await getDb();
  const sessions = await db.collection('sessions').find({ gameId }).sort({ createdAt: 1 }).toArray();
  return new Response(JSON.stringify(sessions), { status: 200 });
}
