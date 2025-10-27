/**
 * PATCH /api/sessions/[id]
 * Allows updating session fields: mark ended, update notes, add custom notes, etc.
 * Expects JSON body: { isEnded?, notes?, customNote? }
 * @param {{ params: { id: string }, request: Request }} param0
 */
export async function PATCH({ params, request }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return createUnauthorizedResponse();
    const sessionId = params.id;
    if (!sessionId) return createErrorResponse('Missing sessionId');
    
    /** @type {Record<string, any>} */
    const update = {};
    const body = await request.json();
    if ('isEnded' in body) update.isEnded = !!body.isEnded;
    if ('date' in body) update.date = body.date;
    if ('notes' in body) {
      for (const [k, v] of Object.entries(body.notes)) {
        update[`notes.${k}`] = v;
      }
    }
    if ('customNote' in body) {
      update['notes.custom'] = body.customNote;
    }
    if (Object.keys(update).length === 0) return createErrorResponse('No fields to update');
    
    const result = await updateSession(sessionId, userId, update);
    if (result) {
      return createJsonResponse({ success: true });
    } else {
      return createErrorResponse('Session not found or not authorized', 404);
    }
  } catch (err) {
    console.error('PATCH /api/sessions/[id] error:', err);
    return createErrorResponse('Internal Server Error', 500);
  }
}


// @ts-ignore
export async function POST({ params, request }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return createUnauthorizedResponse();
    const sessionId = params.id;
    if (!sessionId) return createErrorResponse('Missing sessionId');
    
    const { note } = await request.json();
    if (!note) return createErrorResponse('Missing note');
    
    // Get current session to modify custom notes
    const session = await getSession(sessionId, userId);
    if (!session) return createErrorResponse('Session not found', 404);
    
    let custom = session.notes?.custom || '';
    if (Array.isArray(custom)) {
      custom.push(note);
    } else if (typeof custom === 'string' && custom.length > 0) {
      custom = [custom, note];
    } else {
      custom = [note];
    }
    
    await updateSession(sessionId, userId, { 'notes.custom': custom });
    return createJsonResponse({ success: true });
  } catch (err) {
    console.error('POST /api/sessions/[id]/notes error:', err);
    return createErrorResponse('Internal Server Error', 500);
  }
}
import { updateSession, deleteSession, getSession } from '$lib/models/session.js';
import { 
  getUserIdFromRequest, 
  createUnauthorizedResponse, 
  createJsonResponse, 
  createErrorResponse 
} from '$lib/auth';

/**
 * DELETE /api/sessions/[id]
 * @param {{ params: { id: string }, request: Request }} param0
 */

export async function DELETE({ params, request }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) return createUnauthorizedResponse();
    const sessionId = params.id;
    if (!sessionId) return createErrorResponse('Missing sessionId');
    
    const result = await deleteSession(sessionId, userId);
    if (result) {
      return createJsonResponse({ success: true });
    } else {
      return createErrorResponse('Session not found or not authorized', 404);
    }
  } catch (err) {
    console.error('DELETE /api/sessions/[id] error:', err);
    return createErrorResponse('Internal Server Error', 500);
  }
}
