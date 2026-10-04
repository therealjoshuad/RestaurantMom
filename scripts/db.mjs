// Applies schema.sql and/or seed.sql to the database in DATABASE_URL.
// Usage: node --env-file=.env.local scripts/db.mjs <schema|seed|reset>
// (or: npm run db:schema | db:seed | db:reset)
import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'

const FILES = { schema: ['schema.sql'], seed: ['seed.sql'], reset: ['schema.sql', 'seed.sql'] }
const cmd = process.argv[2]
if (!FILES[cmd]) {
  console.error('Usage: db.mjs <schema|seed|reset>')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (put it in .env.local).')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// Strip "--" comments, then split on statement-ending semicolons. The files are plain
// DDL/INSERTs with no semicolons inside strings or function bodies.
const statements = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .replace(/--.*$/gm, '')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)

for (const file of FILES[cmd]) {
  const stmts = statements(file)
  // One transaction per file: it either applies completely or not at all.
  await sql.transaction(stmts.map((s) => sql.query(s)))
  console.log(`${file}: applied ${stmts.length} statements`)
}

const [c] = await sql`
  SELECT (SELECT count(*)::int FROM restaurants) AS restaurants,
         (SELECT count(*)::int FROM dishes) AS dishes`
console.log(`Database now has ${c.restaurants} restaurants and ${c.dishes} dishes.`)
