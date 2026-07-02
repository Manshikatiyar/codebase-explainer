# Codebase Explainer — MERN-style layout

Converted from the original Replit pnpm monorepo into a simple two-folder layout:

```
client/   → React + Vite frontend
server/   → Express backend (PostgreSQL + Drizzle ORM instead of MongoDB)
```

Note: the original project uses **PostgreSQL**, not MongoDB. Swapping the
database engine to Mongo would mean rewriting the whole schema and every
query, so it was kept as Postgres — only the folder structure was simplified.

## 1. Install prerequisites
- Node.js 18+
- npm
- A PostgreSQL database (local install, or a free hosted one like Neon/Supabase)

## 2. Install dependencies
```
npm run install:all
```

## 3. Configure environment variables
```
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Then edit `server/.env` and fill in:
- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` / `SESSION_SECRET` — any random strings
- `OPENAI_API_KEY` — your OpenAI key

## 4. Push the database schema
```
npm run db:push
```

## 5. Run everything
```
npm run dev
```
This starts both servers together:
- Backend on **http://localhost:5000** (API at `/api/*`)
- Frontend on **http://localhost:5173** (proxies `/api` calls to the backend)

Open **http://localhost:5173** in your browser.

## Project structure
```
client/src/pages       → app pages (landing, auth, dashboard, repo analysis, chat)
client/src/components  → UI components (shadcn/radix based)
client/src/lib/api-client → typed API hooks (generated, talks to the server)
server/src/routes      → Express API routes (auth, repos, files, ai, dashboard)
server/src/db          → Drizzle schema + DB connection
server/src/zod         → Zod request/response types shared with the client's types
```
