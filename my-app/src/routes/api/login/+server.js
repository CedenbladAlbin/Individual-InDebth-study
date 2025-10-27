
import { getDb } from '$lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required.' }), { status: 400 });
  }
  const db = await getDb();
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid email or password.' }), { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid email or password.' }), { status: 401 });
  }
  // Generate JWT token
  const token = jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    import.meta.env.VITE_JWT_SECRET || 'secretkey',
    { expiresIn: '2h' }
  );
  return new Response(
    JSON.stringify({
      success: true,
      token,
      user: { email: user.email, name: user.name, id: user._id }
    }),
    { status: 200 }
  );
}
