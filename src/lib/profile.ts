import { sql } from '@/mastra/db'

// Aggregates for the /profile page. Numeric columns are cast so they arrive as JS numbers.

export type ProfileStats = Awaited<ReturnType<typeof loadProfile>>

export async function loadProfile() {
  const [totals] = await sql`
    SELECT count(*)::int AS dishes,
           (SELECT count(*)::int FROM restaurants) AS restaurants,
           coalesce(round(avg(rating)::numeric, 1), 0)::float8 AS avg_rating,
           count(*) FILTER (WHERE NOT would_order_again)::int AS wont_repeat
    FROM dishes`
  const tags = await sql`
    SELECT tag, round(avg(rating)::numeric, 1)::float8 AS avg_rating, count(*)::int AS times
    FROM dishes, unnest(tags) AS tag
    GROUP BY tag HAVING count(*) >= 2
    ORDER BY avg_rating DESC, times DESC`
  const best = await sql`
    SELECT d.dish, r.name AS restaurant, d.rating, d.note
    FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
    WHERE d.rating = 5 ORDER BY d.eaten_on DESC LIMIT 6`
  const worst = await sql`
    SELECT d.dish, r.name AS restaurant, d.rating, d.note
    FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
    WHERE d.rating <= 2 ORDER BY d.rating ASC, d.eaten_on DESC LIMIT 6`
  const repeats = await sql`
    SELECT lower(d.dish) AS dish, round(avg(d.rating)::numeric, 1)::float8 AS avg_rating,
           count(*)::int AS times, string_agg(r.name, ', ' ORDER BY r.name) AS places
    FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
    GROUP BY lower(d.dish) HAVING count(*) >= 2
    ORDER BY avg_rating ASC, times DESC LIMIT 6`
  const places = await sql`
    SELECT r.name, r.neighborhood, round(avg(d.rating)::numeric, 1)::float8 AS avg_rating,
           count(*)::int AS dishes
    FROM restaurants r JOIN dishes d ON d.restaurant_id = r.id
    GROUP BY r.id HAVING count(*) >= 2
    ORDER BY avg_rating DESC, dishes DESC LIMIT 6`

  return {
    totals: totals as { dishes: number; restaurants: number; avg_rating: number; wont_repeat: number },
    tags: tags as { tag: string; avg_rating: number; times: number }[],
    best: best as { dish: string; restaurant: string; rating: number; note: string | null }[],
    worst: worst as { dish: string; restaurant: string; rating: number; note: string | null }[],
    repeats: repeats as { dish: string; avg_rating: number; times: number; places: string }[],
    places: places as { name: string; neighborhood: string | null; avg_rating: number; dishes: number }[],
  }
}
