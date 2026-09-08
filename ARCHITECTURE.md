# Architecture

## Requested stack
- `enterprise` (Angular 19 + NestJS + tRPC + Prisma + PostgreSQL)

## Scaffolding status
- `enterprise` — ✅ newly scaffolded from `template-enterprise/` (project directory was empty of source; only `README.md` and `.github/workflows/colossus-deploy.yml` pre-existed and were preserved untouched).

## Layout
- `frontend/` — Angular 19 standalone app (project name `frontend`, build output `dist/frontend/browser`).
- `backend/` — NestJS app exposing tRPC routers (`src/trpc/`, `src/users/`) and a health check (`src/health/`), backed by Prisma (`src/prisma/`).
- `.pipeline/surface.json` — generated manifest of routes, components, and `data-testid`s (contract for test/coder agents).
- `.colossus-acceptance.json` — acceptance contract for the post-deploy render gate.
- `colossus.yaml` — build manifest consumed by deploy agents (framework: angular, backend: nestjs on port 3001).
- `docker-compose.yml` — local Postgres + app orchestration.

## Next steps for the developer / build agents
1. Implement the RealWorld/Conduit feature plan on top of this scaffold (Prisma schema, auth, articles, profiles, comments, tags — see project plan).
2. Copy `backend/.env.template` to `backend/.env` (and root `.env.template` to `.env`) if/when those templates are added, and fill in `DATABASE_URL` / `JWT_SECRET`.
3. Run `npm install` in `frontend/` and `backend/` (or via workspace root once configured).
4. Run `npx prisma migrate dev` in `backend/` once the schema is authored.
5. Run `docker-compose up` for local Postgres + app testing.
6. Keep `frontend/package.json` dependencies verbatim unless the plan genuinely requires a new one — the frontend Dockerfile relies on a prebaked `node_modules` seed matching the template's exact dep set.

## Template sources
- `template-enterprise/` from the scaffold-templates library (Angular 19 + NestJS + tRPC + Prisma).
