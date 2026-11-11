import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { getDb } from '$lib/server/db.js';
import { readJson } from '$lib/server/access.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  const { email, password, name } = await readJson(request);
  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string' || !email || !password || !name.trim()) {
    return json({ error: 'All fields are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (password.length > 72) {
    // bcrypt only uses the first 72 bytes
    return json({ error: 'Password must be at most 72 characters.' }, { status: 400 });
  }
  const db = await getDb();
  if (await db.collection('users').findOne({ email })) {
    return json({ error: 'Email already registered.' }, { status: 409 });
  }
  const hashed = await bcrypt.hash(password, 10);
  await db.collection('users').insertOne({ email, name: name.trim().slice(0, 100), password: hashed, createdAt: new Date() });
  return json({ success: true }, { status: 201 });
}
