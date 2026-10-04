# RestaurantMom

A personal agent that remembers every dish you've ordered and how it went, so you never
order the bad French dip twice. Built at Build Personal Agents Hack, Oct 4 2026.

## Stack
- **Mastra** agent + tools
- **Neon** Postgres (history) and AI Gateway (model calls)
- **Exa** menu + review research for places you've never been
- **assistant-ui** chat front end, **Fly.io** hosting

## Setup
```bash
npm create mastra@latest restaurantmom   # pick defaults, then copy src/mastra/* over
cd restaurantmom
npm i @neondatabase/serverless zod
psql "$DATABASE_URL" -f schema.sql       # or paste into the Neon SQL editor
```

`.env`
```
DATABASE_URL=postgres://...neon.tech/neondb?sslmode=require
EXA_API_KEY=...
MODEL=anthropic/claude-sonnet-4-5        # any Mastra model string
ANTHROPIC_API_KEY=...                     # or the provider key your MODEL needs
```

```bash
npx mastra dev    # open Studio, chat with RestaurantMom
```

## Smoke tests (in Studio chat)
1. "I'm at Harrison Street Deli" → warns off the French dip, pushes the pastrami
2. "Thinking about a French dip at Golden Gate Grill" → calls out the pattern
3. "Just had the al pastor at Taqueria Luz, solid 4, nice char" → logs it
4. "I'm going to <real SF place>" → Exa research + taste-based pick

Demo data uses fictional restaurant names on purpose.
