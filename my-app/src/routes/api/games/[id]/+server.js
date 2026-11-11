import { json } from '@sveltejs/kit';
import { requireUser, requireGame } from '$lib/server/access.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, locals }) {
  const userId = requireUser(locals);
  return json(await requireGame(params.id, userId));
}
