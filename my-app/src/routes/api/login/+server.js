import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { getDb } from '$lib/server/db.js';
import { signToken } from '$lib/server/auth.js';
import { readJson } from '$lib/server/access.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  const { email, password } = await readJson(request);
  // Reject non-strings so objects like { "$ne": null } can't reach the query
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return json({ error: 'Email and password are required.' }, { status: 400 });
  }
  const db = await getDb();
  const user = await db.collection('users').findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return json({ error: 'Invalid email or password.' }, { status: 401 });
  }
  return json({
    success: true,
    token: signToken({ _id: user._id, email: user.email, name: user.name }),
    user: { email: user.email, name: user.name, id: user._id }
  });
}
