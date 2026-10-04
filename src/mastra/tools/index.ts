import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { sql, findRestaurant } from '../db'

// ---------------------------------------------------------------
// log_dish: record what Josh ate and how it was
// ---------------------------------------------------------------
export const logDish = createTool({
  id: 'log_dish',
  description:
    'Record a dish the user ate at a restaurant, with a 1-5 rating, whether they would order it again, and why. Creates the restaurant if new.',
  inputSchema: z.object({
    restaurant: z.string().describe('Restaurant name as the user said it'),
    neighborhood: z.string().optional(),
    dish: z.string(),
    rating: z.number().int().min(1).max(5),
    wouldOrderAgain: z.boolean(),
    note: z.string().optional().describe("Short reason in the user's words, e.g. 'bread went soggy'"),
    tags: z
      .array(z.string())
      .optional()
      .describe('Lowercase texture/flavor words pulled from the note: soggy, crispy, salty, bland, spicy, greasy...'),
  }),
  execute: async ({ restaurant, neighborhood, dish, rating, wouldOrderAgain, note, tags }) => {
    let r = await findRestaurant(restaurant)
    if (!r) {
      const rows = await sql`
        INSERT INTO restaurants (name, neighborhood) VALUES (${restaurant}, ${neighborhood ?? null})
        ON CONFLICT (lower(name)) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name`
      r = rows[0]
    }
    await sql`
      INSERT INTO dishes (restaurant_id, dish, rating, would_order_again, note, tags)
      VALUES (${r.id}, ${dish}, ${rating}, ${wouldOrderAgain}, ${note ?? null}, ${tags ?? []})`
    return { saved: true, restaurant: r.name, dish, rating }
  },
})

// ---------------------------------------------------------------
// get_history: everything ordered at one place, best first
// ---------------------------------------------------------------
export const getHistory = createTool({
  id: 'get_history',
  description:
    "Look up everything the user has ordered at a restaurant and how they rated it. Call this FIRST whenever the user says they're at, going to, or asking about a place.",
  inputSchema: z.object({ restaurant: z.string() }),
  execute: async ({ restaurant }) => {
    const r = await findRestaurant(restaurant)
    if (!r) return { found: false, restaurant, dishes: [] }
    const dishes = await sql`
      SELECT dish, rating, would_order_again, note, tags, eaten_on
      FROM dishes WHERE restaurant_id = ${r.id}
      ORDER BY rating DESC, eaten_on DESC`
    return { found: true, restaurant: r.name, neighborhood: r.neighborhood, dishes }
  },
})

// ---------------------------------------------------------------
// get_taste_profile: patterns across ALL restaurants
// ---------------------------------------------------------------
export const getTasteProfile = createTool({
  id: 'get_taste_profile',
  description:
    "Summarize the user's tastes across every restaurant: which texture/flavor tags they rate high or low, and how dish types (e.g. French dip) have gone everywhere, plus his favorites and recent disappointments (look for families of misses, like several battered or fried dishes going soggy). Use for recommendations at new places or when a dish type keeps disappointing.",
  inputSchema: z.object({}),
  execute: async () => {
    const tagStats = await sql`
      SELECT tag, round(avg(rating), 1) AS avg_rating, count(*) AS times
      FROM dishes, unnest(tags) AS tag
      GROUP BY tag HAVING count(*) >= 1
      ORDER BY avg_rating DESC`
    const dishTypes = await sql`
      SELECT lower(d.dish) AS dish, round(avg(d.rating), 1) AS avg_rating,
             count(*) AS times, string_agg(r.name, ', ') AS places
      FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
      GROUP BY lower(d.dish) HAVING count(*) >= 2
      ORDER BY avg_rating ASC`
    const favorites = await sql`
      SELECT d.dish, r.name AS restaurant, d.rating, d.note
      FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
      WHERE d.rating >= 4 ORDER BY d.rating DESC, d.eaten_on DESC LIMIT 8`
    const disappointments = await sql`
      SELECT d.dish, r.name AS restaurant, d.rating, d.note, d.tags
      FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
      WHERE d.rating <= 2 ORDER BY d.rating ASC, d.eaten_on DESC LIMIT 15`
    return { tagStats, repeatedDishes: dishTypes, favorites, disappointments }
  },
})

// ---------------------------------------------------------------
// research_restaurant: Exa search for menu + what reviewers praise
// Plain fetch against the Exa REST API, so no SDK version surprises.
// ---------------------------------------------------------------
export const researchRestaurant = createTool({
  id: 'research_restaurant',
  description:
    "Search the web for a restaurant's menu and which dishes reviewers praise or complain about. Use for places the user has never been, or to fill gaps in their history.",
  inputSchema: z.object({
    restaurant: z.string(),
    city: z.string().default('San Francisco'),
  }),
  execute: async ({ restaurant, city }, { abortSignal }) => {
    const search = async (query: string) => {
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.EXA_API_KEY! },
        body: JSON.stringify({
          query,
          numResults: 4,
          contents: { text: { maxCharacters: 2500 } },
        }),
        signal: abortSignal,
      })
      if (!res.ok) return [{ error: `Exa ${res.status}` }]
      const data = await res.json()
      return (data.results ?? []).map((r: any) => ({ title: r.title, url: r.url, text: r.text }))
    }
    const [menu, reviews] = await Promise.all([
      search(`${restaurant} ${city} menu`),
      search(`${restaurant} ${city} best dishes what to order review`),
    ])
    return { restaurant, menu, reviews }
  },
})

// ---------------------------------------------------------------
// suggest_dishes: cross-restaurant matches from his own history
// ---------------------------------------------------------------
export const suggestDishes = createTool({
  id: 'suggest_dishes',
  description:
    "Find dishes from the user's OWN history, at other restaurants, that match a craving or resemble a dish. Returns what he loved that is similar, and what disappointed him that is similar. Use it to justify recommendations at a new place (pass each candidate menu dish as similarTo, with the tags it implies) and for open-ended asks like 'something spicy' or 'what should I eat tonight'. Only claim a resemblance if this tool returns it.",
  inputSchema: z.object({
    similarTo: z.string().optional().describe("A dish name to resemble, e.g. 'grilled squid'"),
    tags: z
      .array(z.string())
      .optional()
      .describe('Lowercase flavor/texture words the dish or craving implies: crispy, charred, spicy, smoky, soggy, salty...'),
    excludeRestaurant: z.string().optional().describe('Leave out this restaurant, e.g. the one he is at now'),
    limit: z.number().int().min(1).max(8).default(4),
  }),
  execute: async ({ similarTo, tags, excludeRestaurant, limit }) => {
    const wanted = (tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean)
    const exclude = excludeRestaurant ? await findRestaurant(excludeRestaurant) : null
    const name = similarTo ?? ''

    const rank = (min: number, max: number) => sql`
      SELECT * FROM (
        SELECT d.dish, r.name AS restaurant, r.neighborhood, d.rating, d.would_order_again,
               d.note, d.tags,
               cardinality(ARRAY(SELECT unnest(d.tags) INTERSECT SELECT unnest(${wanted}::text[]))) AS shared_tags,
               round(coalesce(similarity(d.dish, ${name}), 0)::numeric, 2) AS name_similarity
        FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
        WHERE d.rating BETWEEN ${min} AND ${max}
          AND (${exclude?.id ?? null}::int IS NULL OR d.restaurant_id <> ${exclude?.id ?? null}::int)
      ) m
      WHERE shared_tags > 0 OR name_similarity > 0.2
      ORDER BY (shared_tags * 2 + name_similarity * 3) DESC, rating DESC
      LIMIT ${limit}`

    const [loved, disappointments] = await Promise.all([rank(4, 5), rank(1, 2)])
    if (loved.length === 0 && disappointments.length === 0 && wanted.length === 0 && !similarTo) {
      // Nothing to match on: fall back to his all-time best.
      const best = await sql`
        SELECT d.dish, r.name AS restaurant, r.neighborhood, d.rating, d.would_order_again, d.note, d.tags
        FROM dishes d JOIN restaurants r ON r.id = d.restaurant_id
        WHERE d.rating = 5 ORDER BY d.eaten_on DESC LIMIT ${limit}`
      return { loved: best, disappointments: [], note: 'No craving given; these are his top-rated dishes.' }
    }
    return { loved, disappointments }
  },
})

export const tools = { logDish, getHistory, getTasteProfile, suggestDishes, researchRestaurant }
