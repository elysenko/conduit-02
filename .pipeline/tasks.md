# Pipeline Task Decomposition

## Summary
Conduit is a RealWorld-shaped blogging platform: registered users write, edit, favorite and comment on articles, follow other authors, and browse a global feed or a personalised feed filtered by tag. The backend is the existing scaffolded NestJS 11 + Prisma + Postgres app in `backend/`, extended with the RealWorld REST contract under `/api` and JWT auth (`Authorization: Token <jwt>`, HS256, 7-day expiry). The frontend is the existing scaffolded Angular standalone app in `frontend/`, rebuilt around signal-based state, URL-addressable routes, and an `HttpClient` data layer. Auth model is `full_auth`: browsing is public, writing requires a session, and an admin-only `/admin` area exposes a settings page for the provisioned backing services (`postgresql`, `minio`). Every file stays under the 400-line surface budget (`.pipeline/surface.json`).

## Surface contract

### REST API (all under global prefix `/api`)
| Method | Path | Auth |
|---|---|---|
| POST | `/api/users` (register) | public |
| POST | `/api/users/login` | public |
| GET | `/api/user` | required |
| PUT | `/api/user` | required |
| GET | `/api/profiles/:username` | optional |
| POST | `/api/profiles/:username/follow` | required |
| DELETE | `/api/profiles/:username/follow` | required |
| GET | `/api/articles` (`tag`, `author`, `favorited`, `limit=10`, `offset=0`) | optional |
| GET | `/api/articles/feed` (`limit`, `offset`) | required |
| GET | `/api/articles/:slug` | optional |
| POST | `/api/articles` | required |
| PUT | `/api/articles/:slug` | required (author only → 403) |
| DELETE | `/api/articles/:slug` | required (author only → 403) |
| POST | `/api/articles/:slug/favorite` | required |
| DELETE | `/api/articles/:slug/favorite` | required |
| GET | `/api/articles/:slug/comments` | optional |
| POST | `/api/articles/:slug/comments` | required |
| DELETE | `/api/articles/:slug/comments/:id` | required (author only → 403) |
| GET | `/api/tags` | public |
| GET | `/api/admin/settings` | required + `ADMIN` |
| PATCH | `/api/admin/settings` | required + `ADMIN` |
| GET | `/api/health`, `/api/health/deep` | public |

### Entities
`User(id, username @unique, email @unique, passwordHash, bio?, image?, role)`, `Article(id, slug @unique, title, description, body, authorId, createdAt, updatedAt)`, `Comment(id, body, articleId, authorId, createdAt, updatedAt)`, `Tag(id, name @unique)`, `ArticleTag(@@id([articleId, tagId]))`, `Favorite(@@id([userId, articleId]))`, `Follow(@@id([followerId, followedId]))`, `SystemSetting(key @id, value, updatedAt)`, plus the platform-owned `ColossusAccount` model (unchanged).

### Response envelopes
`{user:{email,token,username,bio,image}}`, `{profile:{username,bio,image,following}}`, `{article:{slug,title,description,body,tagList,createdAt,updatedAt,favorited,favoritesCount,author}}`, `{articles:[…without body…],articlesCount}`, `{comment:{id,createdAt,updatedAt,body,author}}`, `{comments:[…]}`, `{tags:[string]}`, errors as `{errors:{body:[string]}}`.

### Screens / routes (Angular)
| Route | flow | Notes |
|---|---|---|
| `/` | `home.feed` | `?tab=global\|feed`, `?tag=`, `?page=`; public |
| `/login` | `auth.login` | guest guard |
| `/register` (alias `/signup` → redirect) | `auth.register` | guest guard |
| `/settings` | `user.settings` | auth guard |
| `/editor` | `article.create` | auth guard |
| `/editor/:slug` | `article.edit` | auth guard |
| `/article/:slug` | `article.detail` | `?modal=delete-confirm`, `?modal=delete-comment&commentId=`; public |
| `/profile/:username` | `profile.articles` | public |
| `/profile/:username/favorites` | `profile.favorited` | child route, public |
| `/admin/settings` | `admin.settings` | auth guard + `ADMIN` role |

### Acceptance markers (plain static template text, never interpolated)
`Conduit` (header brand), `Global Feed` (home tabs), `Popular Tags` (home sidebar), and the seeded article title `How to train your dragon` in the article list.

## db_agent tasks
- [ ] Extend `User` in `backend/prisma/schema.prisma` with `username String @unique`, `bio String?`, `image String?`; keep `email @unique`, `passwordHash`, `createdAt`, `updatedAt`.
- [ ] Keep the platform `Role` enum values `ADMIN`, `MANAGER`, `USER` with `role Role @default(USER)` on `User` (full_auth: first/platform ADMIN account can reach `/admin`); do not remove `ColossusAccount`.
- [ ] Add `Article(id, slug @unique, title, description, body, authorId, createdAt, updatedAt)` with `author User @relation(fields:[authorId])` and cascade delete from `User`.
- [ ] Add `Comment(id, body, articleId, authorId, createdAt, updatedAt)` with cascade delete from `Article` and from `User`.
- [ ] Add `Tag(id, name @unique)` and join model `ArticleTag(articleId, tagId, @@id([articleId, tagId]))` with cascade delete from `Article`.
- [ ] Add `Favorite(userId, articleId, createdAt, @@id([userId, articleId]))` with cascade deletes from both sides.
- [ ] Add `Follow(followerId, followedId, createdAt, @@id([followerId, followedId]))` as a named self-relation on `User` (`following` / `followers`).
- [ ] Add `SystemSetting(key String @id, value String, updatedAt DateTime @updatedAt)` for admin-managed service credentials.
- [ ] Add indexes: `Article(@@index([authorId]))`, `Article(@@index([createdAt]))`, `ArticleTag(@@index([tagId]))`, `Comment(@@index([articleId]))`.
- [ ] Generate the initial migration (`prisma migrate dev --name conduit_init`) and run `prisma generate`; verify it applies against a clean Postgres 17 database.
- [ ] Update `backend/prisma/seed/seed.js` to set a unique `username` on every `User` upserted from `COLOSSUS_ACCOUNTS_JSON` (derive from the email local-part, de-duplicate with a numeric suffix); keep it idempotent, value-free in logs, and free of demo rows.
- [ ] Add env-guarded demo fixtures at `backend/prisma/seed/fixtures.js`, run only when `SEED_DEMO_DATA=true`: upsert user `jake` / `jake@demo` / `Demo1234!` / bio `"I work at statefarm"`, article `"How to train your dragon"` with tags `dragons` + `training`, and one comment — all `upsert` so restarts are safe.

## backend_agent tasks
- [ ] In `backend/src/main.ts`: set global prefix `api` (keep `/api/docs` Swagger working), add `ValidationPipe({whitelist:true, transform:true})`, listen on `0.0.0.0:${PORT ?? 3000}`.
- [ ] Add `backend/src/common/filters/http-exception.filter.ts` mapping every thrown error to the RealWorld envelope `{errors:{body:[...]}}` (422 for validation/unique-constraint failures); register globally.
- [ ] Add `backend/src/common/view-models.ts` with pure mappers `toUser`, `toProfile`, `toArticle`, `toArticleSummary` (strips `body`), `toComment`, each taking the optional viewer to compute `favorited` / `following`.
- [ ] Add `backend/src/common/slug.util.ts`: `slugify(title,{lower:true,strict:true})` + `-` + 6-char base36 suffix; slug is generated on create only and immutable across edits.
- [ ] Build `backend/src/auth/` — `auth.module.ts`, `auth.service.ts` (register with `bcryptjs` cost 10, login with hash compare, duplicate username/email → 422), `auth.controller.ts` (`POST /api/users`, `POST /api/users/login`, `GET /api/user`, `PUT /api/user`), DTOs `register.dto.ts` / `login.dto.ts` / `update-user.dto.ts` using `@IsEmail({ require_tld: false })`.
- [ ] Add `backend/src/auth/jwt.strategy.ts` (HS256, 7-day expiry, `JWT_SECRET` from `ConfigService`) parsing both `Authorization: Token <jwt>` and `Bearer <jwt>`, plus `guards/jwt-auth.guard.ts` (401 when absent/invalid) and `guards/optional-jwt.guard.ts` (attaches user when present, never rejects) and `decorators/current-user.decorator.ts`.
- [ ] Add `backend/src/auth/guards/roles.guard.ts` + `@Roles()` decorator enforcing `Role.ADMIN` on the `/api/admin` route group.
- [ ] Build `backend/src/profiles/` — `GET /api/profiles/:username` (optional auth), `POST`/`DELETE /api/profiles/:username/follow` (required auth, idempotent), returning the `profile` envelope with `following`.
- [ ] Build `backend/src/articles/` list + read: `GET /api/articles` with `tag` / `author` / `favorited` / `limit` (default 10) / `offset` filters ordered `createdAt desc`, `GET /api/articles/feed` (required auth, followed authors only), `GET /api/articles/:slug` — all via `OptionalJwtGuard` where auth is optional; `list-articles.query.ts` DTO with transformed numeric `limit`/`offset`.
- [ ] Build `backend/src/articles/` writes: `POST /api/articles` (slug generation, `connectOrCreate` tag upserts), `PUT /api/articles/:slug` and `DELETE /api/articles/:slug` asserting `article.authorId === user.id` else `ForbiddenException` (403); DTOs `create-article.dto.ts`, `update-article.dto.ts`.
- [ ] Add favorites in `articles.service.ts`: `POST`/`DELETE /api/articles/:slug/favorite`, idempotent, returning the article with recomputed `favoritesCount` and `favorited`.
- [ ] Build `backend/src/comments/` — `GET /api/articles/:slug/comments` (optional auth), `POST` (required auth, `create-comment.dto.ts`), `DELETE /api/articles/:slug/comments/:id` (comment author only, else 403).
- [ ] Build `backend/src/tags/` — `GET /api/tags` returning `{tags: string[]}` ordered by article-usage count descending.
- [ ] Extend `backend/src/health/health.controller.ts` — `GET /api/health` → `{status:'ok'}`; `GET /api/health/deep` runs `SELECT 1` via `PrismaService` and reports DB reachability; both public.
- [ ] Add `backend/src/lib/config.ts` exporting `resolveConfig(key: string): Promise<string | null>` — reads `process.env[key]` first; when the value is absent or equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS`, falls back to the `SystemSetting` row for that key; returns `null` when neither is set.
- [ ] Build `backend/src/admin/settings/` — `GET /api/admin/settings` listing the credential keys for `postgresql` (`DATABASE_URL`) and `minio` (`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`) with masked values and a `configured` boolean, and `PATCH /api/admin/settings` upserting key/value pairs into `SystemSetting`; both `ADMIN`-only via `JwtAuthGuard` + `RolesGuard`.
- [ ] Register the new modules in `backend/src/app.module.ts` and retire the scaffold's sample `src/users` tRPC router; keep `TrpcAppModule` mounted only if it still compiles without the sample router, otherwise drop it from the imports.

## ui_agent tasks
- [ ] Rewrite `frontend/src/app/app.routes.ts` with the routes in the surface contract, each carrying `data.flow`, lazy `loadComponent`, `/signup` redirecting to `/register`, and `/profile/:username/favorites` as a child route.
- [ ] Build `frontend/src/app/layout/header.ts` — brand text `Conduit` as literal static template text, nav links (Home, Sign in, Sign up when logged out; New Article, Settings, username, Admin when applicable), and `frontend/src/app/layout/footer.ts`.
- [ ] Build `frontend/src/app/features/home/home.ts` — feed tabs including literal `Global Feed` (plus `Your Feed` when authenticated and a tag tab when `?tag=` is set), article list with title/description/author/date/favorite count, pagination, and a sidebar headed by literal `Popular Tags`; reads `tab`/`tag`/`page` from query params and writes query params on tab/tag/page changes.
- [ ] Build `frontend/src/app/features/article/article-preview.ts` — single article list-item card (author link, date, title, description, favorite button, tag pills) used by home and profile.
- [ ] Build `frontend/src/app/features/auth/login.ts` and `register.ts` — reactive forms, inline `{errors.body}` display, submit-disabled-while-pending.
- [ ] Build `frontend/src/app/features/article/article-detail.ts` — title, body, author meta, follow + favorite buttons, edit/delete affordances for the author only, and delete confirmation driven by `?modal=delete-confirm`.
- [ ] Build `frontend/src/app/features/article/comment-list.ts` — comment form (authenticated only), comment cards with author and timestamp, delete affordance for the comment author using `?modal=delete-comment&commentId=`.
- [ ] Build `frontend/src/app/features/editor/editor.ts` — create and edit modes (`/editor`, `/editor/:slug`), fields title/description/body/tag input with tag pills, server error list.
- [ ] Build `frontend/src/app/features/profile/profile.ts` — user info banner, follow/edit-profile button, and `My Articles` / `Favorited Articles` tabs bound to the child routes.
- [ ] Build `frontend/src/app/features/settings/settings.ts` — form for image URL, username, bio, email, new password, plus logout button.
- [ ] Build `frontend/src/app/features/admin/settings.ts` at `/admin/settings` — one section per provisioned service (`postgresql`, `minio`) with a configured/unconfigured badge and a credential form per service; show a prominent banner `The following need credentials to activate: minio` whenever a listed service reports `configured: false`.
- [ ] Give every list/detail screen explicit loading, empty and error states (e.g. `No articles are here... yet.`) and keep write affordances hidden when unauthenticated.
- [ ] Update `frontend/src/styles.css` and `frontend/src/index.html` with the Conduit layout shell (title `Conduit`, container/nav styling); remove the scaffold `app-home` sample component and its tRPC placeholders, preserving the `app-ready` test id on the app root.

## service_agent tasks
- [ ] Add `frontend/src/app/core/models.ts` — TypeScript interfaces for `User`, `Profile`, `Article`, `Comment`, list envelopes, and the admin settings payload, mirroring the response envelopes above.
- [ ] Add `frontend/src/app/core/auth.store.ts` — signal-based service (`currentUser = signal<User|null>(null)`, `isAuthenticated = computed(...)`, `isAdmin = computed(...)`), token persisted in `localStorage` and rehydrated on boot via `GET /api/user`.
- [ ] Add `frontend/src/app/core/api/auth.api.ts` — `register`, `login`, `currentUser`, `updateUser` against `/api/users*` and `/api/user`.
- [ ] Add `frontend/src/app/core/api/article.api.ts` — list (with `tag`/`author`/`favorited`/`limit`/`offset` params), feed, get, create, update, delete, favorite/unfavorite, and comment list/create/delete.
- [ ] Add `frontend/src/app/core/api/profile.api.ts` and `tag.api.ts` — profile fetch, follow/unfollow, popular tags.
- [ ] Add `frontend/src/app/core/api/admin-settings.api.ts` — `GET`/`PATCH /api/admin/settings`.
- [ ] Add `frontend/src/app/core/interceptors/jwt.interceptor.ts` (sends `Authorization: Token <jwt>` when a token exists) and `error.interceptor.ts` (normalises `{errors:{body:[]}}`, clears the session and routes to `/login` on 401).
- [ ] Add `frontend/src/app/core/guards/auth.guard.ts` (redirect to `/login` with `returnUrl`), `guest.guard.ts` (bounce authenticated users off `/login`/`/register`), and `admin.guard.ts` (require `isAdmin`, else redirect to `/`).
- [ ] Wire `frontend/src/app/app.config.ts` with `provideRouter(routes)` and `provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor]))`; drop the scaffold tRPC client providers and `trpc-client.types.ts`.
- [ ] Point the browser at the API base `/api` and update `frontend/proxy.conf.json` + `frontend/nginx.conf` so `/api` proxies to the backend service in dev and in the deployed frontend container.

## tester tasks
- [ ] `backend/test/auth.e2e-spec.ts` — register → login → `GET /api/user` round-trip; duplicate username/email → 422; login regression asserting the TLD-less address `jake@demo` authenticates (guards the `@IsEmail({require_tld:false})` requirement).
- [ ] `backend/test/articles.e2e-spec.ts` — unauthenticated create → 401; slug derived from title and unchanged after a retitle; `PUT`/`DELETE` by a non-author → 403 *and* the article row is unchanged.
- [ ] `backend/test/articles-list.e2e-spec.ts` — `?tag=` returns only tagged articles; `limit`/`offset` pagination; list items omit `body`; `favorited`/`following` reflect the optional viewer's token.
- [ ] `backend/test/favorites.e2e-spec.ts` — favorite increments `favoritesCount` and is idempotent; the article appears in `GET /api/articles?favorited=<username>`; unfavorite reverses both.
- [ ] `backend/test/profiles-feed.e2e-spec.ts` — follow makes the author's articles appear in `GET /api/articles/feed`; unfollow removes them; unauthenticated follow → 401; `/feed` without a token → 401.
- [ ] `backend/test/comments.e2e-spec.ts` — create requires auth (401 without); list is public; delete by a non-author → 403; delete by the author removes it from the list.
- [ ] `backend/test/admin-settings.e2e-spec.ts` — `GET`/`PATCH /api/admin/settings` return 401 unauthenticated, 403 for a `USER` role, and for `ADMIN` list `postgresql`/`minio` keys with masked values; `PATCH` persists to `SystemSetting` and flips `configured` to true.
- [ ] `backend/test/health.e2e-spec.ts` — `/api/health` returns `{status:'ok'}` and `/api/health/deep` reports DB reachability.
- [ ] `frontend/e2e/acceptance.spec.ts` (Playwright) — load `/` with the demo seed applied and assert all four markers render (`Conduit`, `Global Feed`, `Popular Tags`, `How to train your dragon`); then sign in as `jake` and assert the header shows `jake`.
- [ ] `frontend/e2e/flows.spec.ts` — logged-in create-article → detail page → comment → favorite → follow author → article appears in `Your Feed`; and guarded-route redirect: visiting `/editor` logged out lands on `/login`.
- [ ] Deployment check script — build both images, run `docker compose up`, `curl /api/health/deep`, and `curl /` asserting `Conduit` is present in the served HTML so the frontend-serving chain is verified end to end.

## Open questions
- **Layout mismatch with the spec.** The spec describes an npm-workspaces monorepo (`apps/api`, `apps/web`) served as a single Docker image via `ServeStaticModule`; the scaffold on disk is `backend/` + `frontend/` with two Dockerfiles and an nginx frontend container (`serve_topology: nginx_frontend_plus_backend_supervisor`). All tasks above target the scaffolded layout. Confirm we keep two containers (then the spec's `ServeStaticModule` / `exclude: ['/api/{*path}']` / single-image Dockerfile steps are dropped, and CORS or nginx `/api` proxying must be configured instead).
- **Angular version.** The spec pins Angular 20 for zone.js change detection; the scaffold ships Angular 19. Tasks assume the scaffolded version with signal-based state throughout — confirm whether an upgrade to 20 is in scope.
- **tRPC vs REST.** The scaffold's glue is `nestjs-trpc` + `ngx-trpc`; the spec mandates the RealWorld REST `/api` contract. Tasks assume REST controllers replace the sample tRPC surface — confirm whether the `/trpc` mount must remain for the platform probe (`backend_probe_path` is `/api/docs`, which is preserved).
- **Roles.** The platform contract requires `ADMIN`, `MANAGER`, `USER` and platform-minted logins, while the spec states "no admin role". Tasks keep the three-role enum and add an admin-only `/admin/settings`; `MANAGER` currently has no product behaviour attached — confirm it should stay unused.
- **Demo seed vs no-fixtures policy.** Acceptance marker `How to train your dragon` requires seeded content, but the scaffold's seed is essential-only and unguarded fixtures are flagged by the build gate. Tasks put the `jake` demo data behind `SEED_DEMO_DATA=true` — confirm this env is set in the environment where acceptance markers are checked.
- **minio.** `minio` is provisioned as a backing service but the spec declares no file/image upload behaviour (article images are URLs only). It is surfaced in `/admin/settings` for credential configuration and otherwise unused — confirm no upload feature is expected.
- **Integrations.** `<spec_integrations>` contains a single entry parsed from the literal sentence "None. The spec declares no third-party APIs or SDKs; auth is self-hosted JWT." This is a parsing artifact, not a real integration; no `lib/integrations/*` client is planned and no `NONE_THE_SPEC_...` env key is registered.
- **Password rules and `PUT /api/user`** — the spec does not state minimum password length or whether email/username changes must be re-validated for uniqueness; tasks assume min length 8 and a 422 on collision.
