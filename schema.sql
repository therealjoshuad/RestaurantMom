-- RestaurantMom schema for Neon Postgres
-- Run in the Neon SQL editor (or: psql "$DATABASE_URL" -f schema.sql)

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
-- Demo seed data. Fictional restaurant names on purpose: the repo
-- will be public, so don't publish fake bad reviews of real places.
-- Swap in your real history for your own use.
-- ---------------------------------------------------------------
INSERT INTO restaurants (name, neighborhood) VALUES
  ('Harrison Street Deli', 'SoMa'),
  ('Golden Gate Grill',    'Inner Richmond'),
  ('Mission Taqueria Luz', 'Mission'),
  ('Bayou on Valencia',    'Mission')
ON CONFLICT DO NOTHING;

INSERT INTO dishes (restaurant_id, dish, rating, would_order_again, note, tags, eaten_on) VALUES
  ((SELECT id FROM restaurants WHERE name='Harrison Street Deli'), 'French dip', 1, false,
     'Roll turned to wet cardboard in the jus. Beef was gray and thin.', '{soggy,bland}', '2026-03-14'),
  ((SELECT id FROM restaurants WHERE name='Harrison Street Deli'), 'Pastrami on rye', 5, true,
     'Thick-cut, peppery bark, rye held up. Get this.', '{peppery,hearty}', '2026-05-02'),
  ((SELECT id FROM restaurants WHERE name='Golden Gate Grill'), 'French dip', 2, false,
     'Better than the deli but bread still collapsed. Jus was salty.', '{soggy,salty}', '2026-06-20'),
  ((SELECT id FROM restaurants WHERE name='Golden Gate Grill'), 'Smash burger', 4, true,
     'Crispy edges, good char. Fries were limp though.', '{crispy}', '2026-06-20'),
  ((SELECT id FROM restaurants WHERE name='Mission Taqueria Luz'), 'Carnitas burrito', 5, true,
     'Crispy carnitas, great salsa verde.', '{crispy,spicy}', '2026-07-08'),
  ((SELECT id FROM restaurants WHERE name='Mission Taqueria Luz'), 'Fish tacos', 2, false,
     'Batter went soft fast, fish was mushy.', '{soggy}', '2026-08-15'),
  ((SELECT id FROM restaurants WHERE name='Bayou on Valencia'), 'Shrimp po''boy', 2, false,
     'Not real Leidenheimer-style bread, too soft. Remoulade bland.', '{soggy,bland}', '2026-09-05'),
  ((SELECT id FROM restaurants WHERE name='Bayou on Valencia'), 'Gumbo', 4, true,
     'Dark roux, good andouille. Close to home.', '{smoky,hearty}', '2026-09-05');
