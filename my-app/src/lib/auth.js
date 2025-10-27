// @ts-nocheck
import jwt from 'jsonwebtoken';

/**
 * Extract and verify user ID from request
 * @param {Request} request
 * @returns {string|null}
 */
export function getUserIdFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  
  const token = authHeader.replace('Bearer ', '');
  try {
    const user = jwt.verify(token, import.meta.env.VITE_JWT_SECRET || 'SeretKey');
    return (user && typeof user === 'object' && 'id' in user) ? user.id : null;
  } catch {
    return null;
  }
}

/**
 * Create standard unauthorized response
 */
export function createUnauthorizedResponse() {
  return new Response('Unauthorized', { status: 401 });
}

/**
 * Create standard JSON response
 * @param {any} data 
 * @param {number} status 
 */
export function createJsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { 
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create standard error response
 * @param {string} message 
 * @param {number} status 
 */
export function createErrorResponse(message, status = 400) {
  return new Response(message, { status });
}