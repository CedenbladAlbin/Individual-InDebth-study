import { getUserIdFromRequest } from '$lib/server/auth.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  event.locals.userId = getUserIdFromRequest(event.request);
  return resolve(event);
}
