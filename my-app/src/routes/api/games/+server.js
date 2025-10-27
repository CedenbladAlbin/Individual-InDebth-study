
import { createGame, getUserGames } from '$lib/models/game.js';
import { 
  getUserIdFromRequest, 
  createUnauthorizedResponse, 
  createJsonResponse, 
  createErrorResponse 
} from '$lib/auth.js';


/**
 * Create a new game
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return createUnauthorizedResponse();

  try {
    const { name, description } = await request.json();
    
    if (!name) {
      return createErrorResponse('Game name is required');
    }

    const gameId = await createGame(userId, name, description || '');
    return createJsonResponse({ gameId }, 201);
  } catch (error) {
    return createErrorResponse('Failed to create game', 500);
  }
}


/**
 * Get user's games
 * @param {{ request: Request }} param0
 */
export async function GET({ request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return createUnauthorizedResponse();

  try {
    const games = await getUserGames(userId);
    return createJsonResponse(games);
  } catch (error) {
    return createErrorResponse('Failed to fetch games', 500);
  }
}
