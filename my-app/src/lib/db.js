import { MongoClient } from 'mongodb';

const uri = import.meta.env.VITE_MONGODB_URI;
const dbName = import.meta.env.VITE_MONGODB_DB;

if (!uri) {
  throw new Error('VITE_MONGODB_URI is not defined in environment variables');
}
if (!dbName) {
  throw new Error('VITE_MONGODB_DB is not defined in environment variables');
}

const client = new MongoClient(uri);

/** @type {import('mongodb').Db | null} */
let cachedDb = null;

export async function getDb() {
  if (!cachedDb) {
    await client.connect();
    cachedDb = client.db(dbName);
  }
  return cachedDb;
}