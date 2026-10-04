-- RestaurantMom schema for Neon Postgres
-- Tables and indexes only, and safe to run any number of times.
-- Demo data lives in seed.sql.
-- Run with: npm run db:schema   (or paste into the Neon SQL editor)

CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- fuzzy restaurant-name matching ("tommys" -> "Tommy's Joynt")

CREATE TABLE IF NOT EXISTS restaurants (
  id           serial PRIMARY KEY,
  name         text NOT NULL,
  neighborhood text,
  city         text DEFAULT 'San Francisco',
  created_at   timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_name_uq ON restaurants (lower(name));
CREATE INDEX IF NOT EXISTS restaurants_name_trgm ON restaurants USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS dishes (
  id                serial PRIMARY KEY,
  restaurant_id     int NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish              text NOT NULL,
  rating            smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  would_order_again boolean NOT NULL,
  note              text,                      -- "bread went soggy, jus too salty"
  tags              text[] DEFAULT '{}',       -- ['soggy','salty','crispy','spicy']
  eaten_on          date DEFAULT current_date,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dishes_restaurant_idx ON dishes (restaurant_id);

-- ---------------------------------------------------------------
-- Chat persistence: the one ongoing conversation, stored as an AI SDK
-- UIMessage[] in a single row. Safe to run on an existing database.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_state (
  id         text PRIMARY KEY DEFAULT 'main',
  messages   jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);
