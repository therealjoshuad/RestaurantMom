import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL!)

/** Fuzzy-match a restaurant by name. Returns null if nothing is close. */
export async function findRestaurant(name: string) {
  const rows = await sql`
    SELECT id, name, neighborhood, similarity(name, ${name}) AS score
    FROM restaurants
    WHERE similarity(name, ${name}) > 0.3 OR name ILIKE ${'%' + name + '%'}
    ORDER BY score DESC
    LIMIT 1`
  return rows[0] ?? null
}
