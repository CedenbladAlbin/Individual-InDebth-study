import { getGameData } from '$lib/models/game.js';
import { getUserIdFromRequest } from '$lib/auth';

/**
 * @param {{ request: Request, params: { id: string } }} param0
 */
export async function GET({ request, params }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  const game = await getGameData(params.id, userId);
  if (!game) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(game), { status: 200 });
}
