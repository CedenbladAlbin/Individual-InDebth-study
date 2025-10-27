import { 
  createSession, 
  updateSession, 
  getSessionsByGame, 
  deleteSession 
} from '$lib/models/session.js';
import { 
  getUserIdFromRequest, 
  createUnauthorizedResponse, 
  createJsonResponse, 
  createErrorResponse 
} from '$lib/auth.js';

/**
 * Create or update a session
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return createUnauthorizedResponse();

  try {
    const {
      gameId, title, sessionId, isEnded,
      notes = {},
      connections = {}
    } = await request.json();

    if (!gameId || !title) {
      return createErrorResponse('Missing gameId or title');
    }

    if (sessionId) {
      // Update existing session
      const success = await updateSession(sessionId, userId, {
        gameId, title, isEnded, notes, connections
      });
      
      if (!success) {
        return createErrorResponse('Session not found or unauthorized', 404);
      }
      
      return createJsonResponse({ success: true });
    } else {
      // Create new session
      const newSessionId = await createSession(userId, gameId, title, notes, connections, isEnded);
      return createJsonResponse({ success: true, id: newSessionId }, 201);
    }
  } catch (error) {
    return createErrorResponse('Invalid request data');
  }
}

/**
 * Get sessions for a game
 * @param {{ url: URL, request: Request }} param0
 */
export async function GET({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return createUnauthorizedResponse();

  const gameId = url.searchParams.get('gameId');
  if (!gameId) {
    return createErrorResponse('Missing gameId parameter');
  }

  try {
    const sessions = await getSessionsByGame(gameId, userId);
    return createJsonResponse(sessions);
  } catch (error) {
    return createErrorResponse('Failed to fetch sessions', 500);
  }
}

/**
 * Delete a session
 * @param {{ url: URL, request: Request }} param0
 */
export async function DELETE({ url, request }) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return createUnauthorizedResponse();

  const sessionId = url.pathname.split('/').pop();
  if (!sessionId) {
    return createErrorResponse('Missing sessionId');
  }

  try {
    const success = await deleteSession(sessionId, userId);
    if (!success) {
      return createErrorResponse('Session not found or unauthorized', 404);
    }
    return createJsonResponse({ success: true });
  } catch (error) {
    return createErrorResponse('Failed to delete session', 500);
  }
}
