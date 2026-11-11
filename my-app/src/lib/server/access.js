import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { getDb } from './db.js';

/** @typedef {'npc' | 'player' | 'item' | 'scene'} EntityType */

/** @type {Record<EntityType, string>} */
export const COLLECTIONS = { npc: 'npcs', player: 'players', item: 'items', scene: 'scenes' };

/**
 * @param {unknown} type
 * @returns {type is EntityType}
 */
export function isEntityType(type) {
  return typeof type === 'string' && Object.hasOwn(COLLECTIONS, type);
}

/**
 * Parse an id into an ObjectId, or fail the request with 400.
 * @param {unknown} id
 */
export function oid(id) {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id)) return new ObjectId(id);
  error(400, 'Invalid id');
}

/**
 * Match a reference field that may have been stored as either a string or an ObjectId.
 * @param {unknown} id
 */
export function anyIdForm(id) {
  const o = oid(id);
  return { $in: [o, o.toHexString()] };
}

/**
 * @param {App.Locals} locals
 * @returns {string}
 */
export function requireUser(locals) {
  if (!locals.userId) error(401, 'Unauthorized');
  return locals.userId;
}

/**
 * Load a game owned by the user, or fail with 404.
 * @param {unknown} gameId
 * @param {string} userId
 */
export async function requireGame(gameId, userId) {
  const _id = oid(gameId);
  const db = await getDb();
  const game = await db.collection('games').findOne({ _id, ownerId: userId });
  if (!game) error(404, 'Game not found');
  return game;
}

/**
 * Load a content entity (npc/player/item/scene) that belongs to one of the user's games, or fail with 404.
 * @param {unknown} type
 * @param {unknown} id
 * @param {string} userId
 */
export async function requireEntity(type, id, userId) {
  if (!isEntityType(type)) error(400, 'Invalid type');
  const _id = oid(id);
  const db = await getDb();
  const entity = await db.collection(COLLECTIONS[type]).findOne({ _id });
  if (!entity) error(404, 'Not found');
  const game = await db.collection('games').findOne({ _id: oid(String(entity.gameId)), ownerId: userId });
  if (!game) error(404, 'Not found');
  return entity;
}

/**
 * Load a session owned by the user, or fail with 404.
 * @param {unknown} sessionId
 * @param {string} userId
 */
export async function requireSession(sessionId, userId) {
  const _id = oid(sessionId);
  const db = await getDb();
  const session = await db.collection('sessions').findOne({ _id, userId });
  if (!session) error(404, 'Session not found');
  return session;
}

/**
 * Read a JSON object body, or fail with 400.
 * @param {Request} request
 * @returns {Promise<Record<string, any>>}
 */
export async function readJson(request) {
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    // fall through
  }
  error(400, 'Invalid JSON body');
}

/**
 * @param {unknown} value
 * @param {number} [max]
 */
export function str(value, max = 10000) {
  if (value === undefined || value === null) return '';
  return String(value).slice(0, max);
}
