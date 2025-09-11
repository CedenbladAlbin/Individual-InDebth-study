
import { createGame, getUserGames } from '$lib/models';
import jwt from 'jsonwebtoken';


/**
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  let user;
  try {
    user = jwt.verify(token, import.meta.env.VITE_JWT_SECRET || 'changeme');
  } catch (e) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Cast user to JwtPayload to access id
  const userId = (user && typeof user === 'object' && 'id' in user) ? user.id : undefined;
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { name, description } = await request.json();
  const gameId = await createGame(userId, name, description);
  return new Response(JSON.stringify({ gameId }), { status: 201 });
}


/**
 * @param {{ request: Request }} param0
 */
export async function GET({ request }) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  let user;
  try {
    user = jwt.verify(token, import.meta.env.VITE_JWT_SECRET || 'changeme');
  } catch (e) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Cast user to JwtPayload to access id
  const userId = (user && typeof user === 'object' && 'id' in user) ? user.id : undefined;
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  const games = await getUserGames(userId);
  return new Response(JSON.stringify(games), { status: 200 });
}
