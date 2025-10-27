// @ts-nocheck
import { ObjectId } from 'mongodb';
import { NoteModel } from './EntityModel.js';

/**
 * Create a new note
 * @param {string} gameId
 * @param {object} note
 */
export async function addNote(gameId, note) {
  return await NoteModel.create({
    ...note,
    gameId: new ObjectId(gameId)
  });
}
