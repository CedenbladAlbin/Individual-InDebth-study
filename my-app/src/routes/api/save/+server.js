import { getDb } from '$lib/db';

/**
 * @param {{ request: Request }} param0
 */
export async function POST({ request }) {
  const data = await request.json();
  const db = await getDb();
  const result = await db.collection('items').insertOne(data);
  return new Response(JSON.stringify({ insertedId: result.insertedId }), { status: 201 });
}
