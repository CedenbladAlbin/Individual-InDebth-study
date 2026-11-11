import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters');
}

/**
 * @param {{ _id: any, email: string, name: string }} user
 */
export function signToken(user) {
  return jwt.sign(
    { id: String(user._id), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h', algorithm: 'HS256' }
  );
}

/**
 * Returns the user id from a valid `Authorization: Bearer <jwt>` header, otherwise null.
 * @param {Request} request
 * @returns {string | null}
 */
export function getUserIdFromRequest(request) {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET, { algorithms: ['HS256'] });
    return payload && typeof payload === 'object' && typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}
