import { getDb } from '$lib/db';
import bcrypt from 'bcryptjs';

/**
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const { email, password, name } = await request.json();
  if (!email || !password || !name) {
    return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
  }
  const db = await getDb();
  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    return new Response(JSON.stringify({ error: 'Email already registered.' }), { status: 409 });
  }
  const hashed = await bcrypt.hash(password, 10);
  await db.collection('users').insertOne({ email, name, password: hashed, createdAt: new Date() });
  return new Response(JSON.stringify({ success: true }), { status: 201 });
}
