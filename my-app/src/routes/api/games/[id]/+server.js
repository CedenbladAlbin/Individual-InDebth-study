import { getGameData } from '$lib/models';
import jwt from 'jsonwebtoken';

/**
 * @param {{ request: Request, params: { id: string } }} param0
 */
export async function GET({ request, params }) {
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
  const userId = (user && typeof user === 'object' && 'id' in user) ? user.id : undefined;
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  const game = await getGameData(params.id, userId);
  if (!game) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(game), { status: 200 });
}
