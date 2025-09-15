// @ts-nocheck
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';

export async function addNote(gameId, note) {
  const db = await getDb();
  note.gameId = new ObjectId(gameId);
  note.createdAt = new Date();
  return db.collection('notes').insertOne(note);
}
