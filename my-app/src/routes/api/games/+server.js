import { json, error } from '@sveltejs/kit';
import { createGame, getUserGames } from '$lib/server/game.js';
import { requireUser, readJson, str } from '$lib/server/access.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  const userId = requireUser(locals);
  const { name, description } = await readJson(request);
  if (typeof name !== 'string' || !name.trim()) error(400, 'Name is required');
  const gameId = await createGame(userId, str(name, 200).trim(), str(description));
  return json({ gameId }, { status: 201 });
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
  const userId = requireUser(locals);
  return json(await getUserGames(userId));
}
