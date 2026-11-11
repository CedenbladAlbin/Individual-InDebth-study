import { MongoClient } from 'mongodb';
import { MONGODB_URI, MONGODB_DB } from '$env/static/private';

if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');
if (!MONGODB_DB) throw new Error('MONGODB_DB is not set');

const client = new MongoClient(MONGODB_URI);

/** @type {Promise<import('mongodb').Db> | null} */
let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = client.connect().then((c) => c.db(MONGODB_DB));
    // Allow a retry on the next request if the first connection attempt fails
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}
