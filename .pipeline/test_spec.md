# Test Specification

> **WARNING — `surface.json` is stale and was NOT used as the authoritative surface.**
> `.pipeline/surface.json` is an untouched scaffold artifact (`"_generated": true`,
> `"_scaffolded_at": "2026-09-08T05:37:00Z"`). It lists three routes from the sample
> tRPC users demo (`GET /health`, `GET /trpc/users.findAll`, `GET /trpc/users.findById`)
> and two scaffold components (`app-root`, `app-home`) that the spec explicitly retires.
> None of the RealWorld `/api` contract appears in it.
>
> This spec therefore derives the API surface from the **spec** plus the **Surface contract**
> section of `.pipeline/tasks.md`, and treats `surface.json` as follows:
> - `GET /health` → carried forward as `GET /api/health` (covered, API-101/102).
> - `GET /trpc/users.*` → retired with the sample router; see **Out of scope**.
> - `testIds` `home-title`/`users-list`/`users-loading`/`users-error` → retired; note that
>   `.colossus-acceptance.json` **rejects** the signatures `home-title">Users<`,
>   `Loading...` and `Failed to load users.`, so their absence is itself asserted (UI-001).
> - `testId` `app-ready` → **must be preserved** on the app root; it is the acceptance
>   readiness probe (UI-001).
> - `fileBudget.maxLines: 400` / `hardLimit: 500` → asserted by DI-010.
>
> Two further contradictions the implementation must resolve before these tests can pass;
> the affected cases are written against the **tasks.md** resolution (two containers,
> `backend/` + `frontend/`, nginx proxying `/api`), not the spec's single-image
> `ServeStaticModule` layout:
> - Spec says `apps/api` + `apps/web` single image; disk + tasks.md say `backend/` + `frontend/`.
> - Spec says "no admin role"; the platform contract and tasks.md require `ADMIN` and
>   `/api/admin/settings`. Admin cases (API-092…100, UI-044…046) are **conditional** — if the
>   admin area is dropped, mark them not-applicable rather than failing.

## Coverage summary
- Total cases: 165
- API endpoints covered: 23 / 23 authoritative endpoints (from spec + `tasks.md`).
  Against the stale `surface.json`: 1 of its 3 routes carried forward and covered, 2 retired.
- User journeys covered: 15

## API tests

Shared fixtures for every API case below:
- `jake` — seeded demo user, email `jake@demo`, password `Demo1234!`, bio `"I work at statefarm"`,
  author of article `"How to train your dragon"` (tags `dragons`, `training`) with one comment.
  Requires `SEED_DEMO_DATA=true`.
- `alice`, `bob` — registered in-test, used as non-author / second-viewer actors.
- `admin` — a user with `role: ADMIN` (platform-minted via `COLOSSUS_ACCOUNTS_JSON`).
- Auth header is `Authorization: Token <jwt>` unless a case says otherwise.
- Every error body must match `{errors:{body:[<string>,…]}}`.

### `POST /api/users`
- **Happy path**: `{user:{username:"alice",email:"alice@example.com",password:"Passw0rd!"}}`
  → **API-001** `201`, body `{user:{email,token,username,bio:null,image:null}}`; `token` is a
  parseable HS256 JWT whose `exp` is ~7 days out; `password`/`passwordHash` absent from the response.
- **Validation failures**:
  - **API-002** missing `username` → `422`, `errors.body` non-empty.
  - **API-003** `email:"not-an-email"` → `422`.
  - **API-004** `password:"short"` (<8 chars) → `422`.
  - **API-005** email already registered → `422`, message names the email/uniqueness (not a 500 Prisma P2002 leak).
  - **API-006** username already registered → `422`.
  - **API-007** body includes `role:"ADMIN"` → `ValidationPipe({whitelist:true})` strips it; user is created
    with `role: USER`. Privilege escalation via registration must be impossible.
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**: n/a — registration is deliberately non-idempotent (API-005/006).

### `POST /api/users/login`
- **Happy path**: **API-008** `{user:{email:"alice@example.com",password:"Passw0rd!"}}` → `200`,
  `{user:{email,token,username,bio,image}}`, token usable on `GET /api/user`.
- **Validation failures**: **API-012** missing `password` → `422`.
- **Auth failures**:
  - **API-010** correct email, wrong password → `401` (not `422`, not `404`).
  - **API-011** unknown email → `401`, and the response is indistinguishable from API-010
    (no user-enumeration signal in status or body).
- **Idempotency / edge cases**:
  - **API-009** **TLD-less email regression**: `{email:"jake@demo",password:"Demo1234!"}` → `200` with a
    valid token. This is the `@IsEmail({require_tld:false})` guard; a `422` here means the default
    `@IsEmail()` shipped and the spec's own seed account cannot authenticate.

### `GET /api/user`
- **Happy path**: **API-013** with `Authorization: Token <jwt>` → `200`, `{user:{email,token,username,bio,image}}`
  matching the logged-in user; a fresh/valid `token` is returned in the envelope.
- **Validation failures**: n/a.
- **Auth failures**:
  - **API-015** no `Authorization` header → `401`.
  - **API-016** `Token abc.def.ghi` (malformed/garbage) → `401`.
  - **API-017** token signed with the wrong secret, or with `exp` in the past → `401`.
- **Idempotency / edge cases**: **API-014** `Authorization: Bearer <jwt>` is also accepted → `200`
  (tasks.md requires the strategy parse both schemes).

### `PUT /api/user`
- **Happy path**: **API-018** `{user:{bio:"I work at statefarm",image:"https://i/x.png"}}` → `200`,
  updated fields echoed; re-fetching `GET /api/user` shows the same values.
- **Validation failures**:
  - **API-021** change `email` to one another user already owns → `422`, and the requester's email is unchanged.
  - **API-019** partial update (`{user:{bio:"only bio"}}`) leaves `username`, `email` and the password intact.
- **Auth failures**: **API-022** no token → `401`.
- **Idempotency / edge cases**: **API-020** `{user:{password:"NewPassw0rd!"}}` → `200`; subsequent login with
  the old password → `401`, with the new password → `200`.

### `GET /api/profiles/:username`
- **Happy path**: **API-023** anonymous `GET /api/profiles/jake` → `200`,
  `{profile:{username:"jake",bio:"I work at statefarm",image,following:false}}`.
- **Validation failures**: n/a.
- **Auth failures**: n/a (optional auth — must never `401`).
- **Idempotency / edge cases**:
  - **API-024** as `alice` who follows `jake` → `following:true`. This is the `OptionalJwtGuard`
    regression: a `false` here with a valid token means the guard was omitted.
  - **API-025** `GET /api/profiles/nosuchuser` → `404`.

### `POST /api/profiles/:username/follow`
- **Happy path**: **API-026** `alice` follows `jake` → `200`, `{profile:{…,following:true}}`;
  one `Follow` row exists.
- **Validation failures**: **API-029** unknown username → `404`.
- **Auth failures**: **API-028** no token → `401`.
- **Idempotency / edge cases**:
  - **API-027** calling it twice → both `200` with `following:true`; exactly **one** `Follow` row
    (no unique-constraint `500`).
  - **API-030** `alice` follows `alice` → self-follow is rejected `422` **or** is a no-op returning
    `following:false`; either is acceptable, a `500` is not.

### `DELETE /api/profiles/:username/follow`
- **Happy path**: **API-031** `alice` unfollows `jake` → `200`, `{profile:{…,following:false}}`;
  the `Follow` row is gone.
- **Validation failures**: covered by API-029 semantics (unknown username → `404`).
- **Auth failures**: **API-033** no token → `401`.
- **Idempotency / edge cases**: **API-032** unfollowing someone never followed → `200`,
  `following:false`, no error.

### `GET /api/articles`
- **Happy path**: **API-034** anonymous → `200`, `{articles:[…],articlesCount:<int>}`; default page size
  is 10; ordering is `createdAt desc` (assert with 3 articles created in a known order).
- **Validation failures**: **API-043** `?limit=abc` or `?limit=-5` → `422` (or clamps to the default;
  assert deterministically against whichever the DTO defines — never a `500` and never an unbounded query).
- **Auth failures**: n/a (optional auth — must never `401`).
- **Idempotency / edge cases**:
  - **API-035** every list item **omits `body`** (RealWorld multiple-articles shape) while still carrying
    `slug,title,description,tagList,createdAt,updatedAt,favorited,favoritesCount,author`.
  - **API-036** `?tag=dragons` returns only articles carrying that tag; an article tagged only
    `training` is absent.
  - **API-037** `?author=jake` returns only `jake`'s articles.
  - **API-038** `?favorited=alice` returns only articles `alice` has favorited.
  - **API-039** `?limit=1&offset=1` returns the 2nd article of the unpaged ordering;
    `articlesCount` reports the **total** matching count, not the page length.
  - **API-040** as `alice` (who favorited the dragon article and follows `jake`) →
    that item has `favorited:true` and `author.following:true`.
  - **API-041** the same request anonymous → `favorited:false`, `author.following:false`.
  - **API-042** `?tag=nonexistent` → `200`, `{articles:[],articlesCount:0}` (not `404`).

### `GET /api/articles/feed`
- **Happy path**: **API-044** `alice` follows `jake` → `200`; `jake`'s articles are present,
  articles by unfollowed `bob` are absent.
- **Validation failures**: pagination behaves as API-039 → **API-047** `?limit=1&offset=0` returns
  one item with the full `articlesCount`.
- **Auth failures**: **API-045** no token → `401` (feed is the one list endpoint requiring auth).
- **Idempotency / edge cases**:
  - **API-046** `alice`'s **own** articles do not appear in her feed (followed authors only).
  - **API-048** a user following nobody → `200`, `{articles:[],articlesCount:0}`.

### `GET /api/articles/:slug`
- **Happy path**: **API-049** anonymous `GET /api/articles/<dragon-slug>` → `200`,
  `{article:{…}}` **including `body`** (unlike list responses), with `tagList`
  containing `dragons` and `training` and nested `author.following`.
- **Validation failures**: n/a.
- **Auth failures**: n/a (optional auth).
- **Idempotency / edge cases**:
  - **API-050** unknown slug → `404`.
  - **API-051** as a viewer who favorited it and follows the author → `favorited:true`,
    `favoritesCount>=1`, `author.following:true`.

### `POST /api/articles`
- **Happy path**: **API-052** `alice` posts `{article:{title:"How To Train Your Dragon",
  description:"Ever wonder how?",body:"You have to believe",tagList:["dragons","training"]}}`
  → `201`, `{article:{…}}` with `slug` matching `^how-to-train-your-dragon-[a-z0-9]{6}$`
  (slugified title + `-` + 6-char base36 suffix), `favorited:false`, `favoritesCount:0`,
  `author.username:"alice"`.
- **Validation failures**:
  - **API-056** missing `title` → `422`; likewise missing `description` or `body`.
  - **API-057** omitted or empty `tagList` → `201` with `tagList:[]`.
- **Auth failures**: **API-055** no token → `401`.
- **Idempotency / edge cases**:
  - **API-053** posting the **same title twice** → both succeed with **different** slugs
    (the base36 suffix guarantees uniqueness; no `422`/`500` on `slug @unique`).
  - **API-054** posting with an existing tag `dragons` reuses the existing `Tag` row
    (`connectOrCreate`) — exactly one `Tag` named `dragons` in the DB afterwards.

### `PUT /api/articles/:slug`
- **Happy path**: **API-058** author updates `{article:{title:"New Title",description:"d2",body:"b2"}}`
  → `200` with the new field values.
- **Validation failures**: **API-063** partial update `{article:{description:"only"}}` → `200`;
  `title` and `body` unchanged.
- **Auth failures**:
  - **API-061** no token → `401`.
  - **API-060** `bob` (non-author) updates `alice`'s article → **`403`** (not `401`, not `404`),
    **and** a follow-up `GET` shows `title`/`description`/`body` **byte-identical** to before.
    Asserting the row is unchanged is required, not optional.
- **Idempotency / edge cases**:
  - **API-059** **slug immutability**: after retitling in API-058, the response `slug` and a
    `GET /api/articles/<original-slug>` both still resolve to the original slug; the new title does
    **not** produce a new slug and the old link does **not** `404`.
  - **API-062** unknown slug → `404`.

### `DELETE /api/articles/:slug`
- **Happy path**: **API-064** author deletes → `200`/`204`; a subsequent `GET` on that slug → `404`
  and the article is gone from `GET /api/articles`.
- **Validation failures**: **API-068** unknown slug → `404`.
- **Auth failures**:
  - **API-066** no token → `401`.
  - **API-065** `bob` deletes `alice`'s article → **`403`**, **and** the article is still fetchable
    at its slug afterwards.
- **Idempotency / edge cases**: **API-067** deleting an article that has comments, tag links and
  favorites succeeds and cascades — its `Comment`, `ArticleTag` and `Favorite` rows are gone, while
  the `Tag` rows themselves and the favoriting `User` rows survive.

### `POST /api/articles/:slug/favorite`
- **Happy path**: **API-069** `alice` favorites the dragon article → `200`,
  `{article:{favorited:true,favoritesCount:<prev+1>}}`.
- **Validation failures**: **API-072** unknown slug → `404`.
- **Auth failures**: **API-071** no token → `401`.
- **Idempotency / edge cases**: **API-070** favoriting twice → both `200`, `favoritesCount` increments
  **once** total, exactly one `Favorite` row (no unique-constraint `500`).

### `DELETE /api/articles/:slug/favorite`
- **Happy path**: **API-073** `alice` unfavorites → `200`, `favorited:false`,
  `favoritesCount` back to the pre-favorite value; the article no longer appears in
  `GET /api/articles?favorited=alice`.
- **Validation failures**: unknown slug → `404` (mirrors API-072).
- **Auth failures**: **API-075** no token → `401`.
- **Idempotency / edge cases**: **API-074** unfavoriting an article never favorited → `200`,
  `favorited:false`, `favoritesCount` unchanged and never negative.

### `GET /api/articles/:slug/comments`
- **Happy path**: **API-076** anonymous → `200`, `{comments:[{id,createdAt,updatedAt,body,author:{username,bio,image,following}}]}`;
  the seeded comment on the dragon article is present.
- **Validation failures**: n/a.
- **Auth failures**: n/a (optional auth — must never `401`).
- **Idempotency / edge cases**:
  - **API-077** with three comments created in a known order, the response order is deterministic
    and documented (assert `createdAt` ascending or descending consistently).
  - **API-078** unknown slug → `404`.
  - **API-079** article with no comments → `200`, `{comments:[]}`.

### `POST /api/articles/:slug/comments`
- **Happy path**: **API-080** `alice` posts `{comment:{body:"Thank you so much!"}}` → `201`,
  `{comment:{id,createdAt,updatedAt,body,author}}` with `author.username:"alice"`;
  it then appears in `GET …/comments`.
- **Validation failures**: **API-082** `{comment:{body:""}}` (or missing `body`) → `422`.
- **Auth failures**: **API-081** no token → `401`.
- **Idempotency / edge cases**: **API-083** unknown slug → `404`.

### `DELETE /api/articles/:slug/comments/:id`
- **Happy path**: **API-084** the comment's author deletes it → `200`/`204`; it is absent from
  a follow-up `GET …/comments` and the remaining comments are untouched.
- **Validation failures**:
  - **API-087** unknown comment id → `404`.
  - **API-088** a comment id that exists but belongs to a **different** article → `404`
    (no cross-article deletion via a mismatched slug).
- **Auth failures**:
  - **API-086** no token → `401`.
  - **API-085** `bob` deletes `alice`'s comment → **`403`**, **and** the comment is still present
    in the list afterwards.
- **Idempotency / edge cases**: covered by API-087.

### `GET /api/tags`
- **Happy path**: **API-089** → `200`, `{tags:["dragons","training",…]}` — a flat array of **strings**,
  not objects, with no duplicates.
- **Validation failures**: n/a.
- **Auth failures**: **API-091** public — succeeds with no `Authorization` header and also with one.
- **Idempotency / edge cases**: **API-090** with tag `dragons` on 3 articles and `training` on 1,
  `dragons` precedes `training` (ordered by article-usage count descending).

### `GET /api/admin/settings`
*(Conditional — see the warning header. Skip if the admin area is dropped in favour of the spec's "no admin role".)*
- **Happy path**: **API-092** as `admin` → `200`, one entry per credential key for `postgresql`
  (`DATABASE_URL`) and `minio` (`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`),
  each with a masked `value` and a boolean `configured`.
- **Validation failures**: n/a.
- **Auth failures**:
  - **API-094** no token → `401`.
  - **API-093** as a `USER`-role token → `403` (`RolesGuard`, distinct from the `401`).
- **Idempotency / edge cases**: **API-095** the masked value never contains the raw secret —
  set `MINIO_SECRET_KEY` to a known sentinel and assert the sentinel substring is **absent**
  from the entire response body.

### `PATCH /api/admin/settings`
*(Conditional — same caveat as above.)*
- **Happy path**: **API-096** as `admin`, `PATCH {MINIO_ACCESS_KEY:"k",MINIO_SECRET_KEY:"s"}` → `200`;
  `SystemSetting` rows exist for both keys and a follow-up `GET` reports `configured:true` for them.
- **Validation failures**: **API-099** an unknown/unlisted key → `422`; no `SystemSetting` row is written
  (the endpoint is not an arbitrary key-value store).
- **Auth failures**: **API-098** no token → `401`; **API-097** `USER` role → `403`.
- **Idempotency / edge cases**: **API-100** with `MINIO_BUCKET` unset in env **or** set to the literal
  `PLACEHOLDER_CONFIGURE_IN_SETTINGS`, `resolveConfig('MINIO_BUCKET')` returns the `SystemSetting`
  value; with a real env value set, env wins; with neither, it returns `null`.

### `GET /api/health`
- **Happy path**: **API-101** → `200`, exactly `{status:"ok"}`.
- **Validation failures**: n/a.
- **Auth failures**: **API-102** public — `200` with no `Authorization` header (it is the k8s liveness
  probe; a `401` here would crash-loop the pod).
- **Idempotency / edge cases**: responds without touching the DB (still `200` in API-104's DB-down state).

### `GET /api/health/deep`
- **Happy path**: **API-103** with Postgres reachable → `200`, body reports DB reachability
  (`SELECT 1` succeeded).
- **Validation failures**: n/a.
- **Auth failures**: **API-105** public — `200` with no `Authorization` header (k8s readiness probe).
- **Idempotency / edge cases**: **API-104** with Postgres stopped/unreachable → a **non-2xx**
  status (`503`) or an explicit `database:"unreachable"` flag — it must **not** report `ok`,
  otherwise readiness gating is meaningless.

## UI / journey tests

Playwright, run against the deployed compose stack with `SEED_DEMO_DATA=true`.
Every journey waits on the `app-ready` test id before asserting.

### Journey: Anonymous home page & acceptance markers
- **Steps**: navigate to `/` (logged out); wait for `[data-testid="app-ready"]`.
- **Expected outcomes**:
  - **UI-001** all four markers are present as literal rendered text: `Conduit` (header brand),
    `Global Feed` (feed tab), `Popular Tags` (sidebar heading), `How to train your dragon`
    (article list). Additionally the rejected scaffold signatures `home-title">Users<`,
    `Loading...` and `Failed to load users.` are **absent** from the served DOM
    (`.colossus-acceptance.json` `reject_signatures`).
  - **UI-002** the dragon article card shows its title, description, author `jake`, a date and a
    favorite count.
  - **UI-003** logged out, the header shows `Sign in` / `Sign up` and **no** `New Article`,
    `Settings` or username link; no favorite/follow write affordances are rendered.
  - **UI-004** the `Popular Tags` sidebar renders at least the pills `dragons` and `training`.
- **Negative path**: **UI-005** with `GET /api/articles` stubbed to `500`, the home page renders a
  visible error state and neither hangs on a spinner nor shows a blank list.

### Journey: Register a new account
- **Steps**: `/` → click `Sign up` → fill username/email/password → submit.
- **Expected outcomes**: **UI-006** redirected off `/register`, header shows the new username,
  and `New Article` / `Settings` links appear.
- **Negative path**:
  - **UI-007** registering with `jake@demo` again → stays on `/register`, renders the server's
    `errors.body` message inline; no redirect.
  - **UI-008** the submit button is disabled while the request is in flight and re-enables after
    the error (no double-submit).

### Journey: Sign in as the seeded demo user
- **Steps**: `/login` → email `jake@demo`, password `Demo1234!` → submit.
- **Expected outcomes**: **UI-009** redirected to `/`; the header shows `jake`.
  (This is the UI half of the `@IsEmail({require_tld:false})` regression.)
- **Negative path**:
  - **UI-010** wrong password → stays on `/login`, inline error rendered, header still shows `Sign in`.
  - **UI-011** after a successful login, a full page reload keeps the session — header still shows
    `jake` (token rehydrated from `localStorage` via `GET /api/user`).
  - **UI-012** while logged in, navigating to `/login` or `/register` → `guestGuard` redirects to `/`.

### Journey: Route guards for authenticated areas
- **Steps**: logged out, navigate directly to each guarded URL.
- **Expected outcomes**:
  - **UI-013** `/editor` → lands on `/login`, URL carries a `returnUrl` query param.
  - **UI-014** `/settings` → lands on `/login`.
  - **UI-016** completing login from UI-013 lands back on `/editor`, not `/`.
- **Negative path**: **UI-015** logged in as a plain `USER`, navigating to `/admin/settings`
  redirects to `/` and never renders credential fields. *(Conditional on the admin area existing.)*

### Journey: Create an article
- **Steps**: signed in as `alice` → `New Article` → fill title/description/body → type `dragons`
  and press Enter in the tag input → `Publish`.
- **Expected outcomes**:
  - **UI-017** navigates to `/article/<slug>` showing the new title, body and `alice` as author.
  - **UI-018** the typed tag renders as a pill before submit and appears on the published article.
- **Negative path**: **UI-019** publishing with an empty title → stays on `/editor` and renders the
  server `errors.body` list; no navigation.

### Journey: Edit an article
- **Steps**: as the author, open the article → `Edit Article` → change the title → save.
- **Expected outcomes**:
  - **UI-020** the editor is pre-filled with the existing title/description/body/tags; after saving,
    the detail page shows the new title.
  - **UI-021** the browser URL slug is **unchanged** after the retitle, and reloading that URL still
    resolves the article (slug immutability, visible half of API-059).
- **Negative path**: **UI-022** viewing the same article as `bob` shows **no** `Edit Article` /
  `Delete Article` buttons.

### Journey: Delete an article (confirmation modal)
- **Steps**: as the author on `/article/<slug>`, click `Delete Article`.
- **Expected outcomes**:
  - **UI-023** the URL becomes `?modal=delete-confirm` and the confirmation dialog is visible;
    loading that URL **directly** also renders the dialog (URL-addressable state).
  - **UI-024** confirming deletes the article and navigates to `/`; the title is gone from the list.
- **Negative path**: **UI-025** cancelling clears the `modal` query param and leaves the article intact.

### Journey: Comment on an article
- **Steps**: signed in as `alice`, open the dragon article, type a comment, submit.
- **Expected outcomes**:
  - **UI-026** the comment appears in the list with author `alice` and a timestamp, without a reload.
  - **UI-027** clicking delete on her own comment sets `?modal=delete-comment&commentId=<id>`;
    confirming removes it from the list. `jake`'s seeded comment shows no delete affordance for `alice`.
- **Negative path**: **UI-028** logged out, the article page renders the comment list but **no**
  comment form — instead a `Sign in`/`Sign up` prompt.

### Journey: Favorite an article
- **Steps**: signed in as `alice`, click the favorite button on the dragon card on `/`.
- **Expected outcomes**:
  - **UI-029** the count increments by 1 and the button switches to its active state; reloading `/`
    preserves both (server state, not local-only).
  - **UI-030** clicking again decrements it back and clears the active state.
- **Negative path**: **UI-031** logged out, the favorite affordance is either hidden or routes to
  `/login` — it never silently fails or shows an optimistic increment that the server rejected.

### Journey: Follow an author and read Your Feed
- **Steps**: signed in as `alice` → `/profile/jake` → `Follow jake` → `/` → `Your Feed` tab.
- **Expected outcomes**:
  - **UI-032** the button flips to `Unfollow jake`; a reload preserves it.
  - **UI-033** the `Your Feed` tab lists `How to train your dragon`; `alice`'s own articles are absent.
- **Negative path**: **UI-034** unfollowing removes the article from `Your Feed`, which then shows
  its empty state (e.g. `No articles are here... yet.`) rather than a blank panel.

### Journey: Tag filter, tabs and pagination as URL state
- **Steps**: on `/`, click the `dragons` tag pill; then paginate; then reload.
- **Expected outcomes**:
  - **UI-035** clicking the tag writes `?tag=dragons` to the URL and the list shows only
    `dragons`-tagged articles, with a tag tab appearing next to `Global Feed`.
  - **UI-036** reloading `/?tag=dragons` restores the filtered view and the active tab —
    state is read from query params, not held only in component memory.
  - **UI-037** with >10 articles seeded, clicking page 2 writes `?page=2` and shows the next
    10 items (offset applied); reloading `?page=2` restores it.
  - **UI-038** reloading `/?tab=feed` while signed in restores the `Your Feed` tab as active.
- **Negative path**: `/?tag=nonexistent` renders the empty state, not an error or a full list.

### Journey: Profile page tabs
- **Steps**: navigate to `/profile/jake`, then the `Favorited Articles` tab.
- **Expected outcomes**:
  - **UI-039** the banner shows `jake`, the bio `I work at statefarm`, and `My Articles` lists
    `How to train your dragon`.
  - **UI-040** `Favorited Articles` navigates to `/profile/jake/favorites` (child route) and lists
    only articles `jake` favorited; the URL is reload-safe.
- **Negative path**: **UI-041** `/profile/nosuchuser` renders a not-found state, not a crash or an
  infinite spinner.

### Journey: Settings and logout
- **Steps**: signed in as `jake` → `Settings` → change the bio → save; then click logout.
- **Expected outcomes**: **UI-042** the saved bio is reflected on `/profile/jake` after navigation.
- **Negative path**: **UI-043** logout clears the session — header returns to `Sign in`/`Sign up`,
  `localStorage` no longer holds the token, and navigating to `/settings` redirects to `/login`.

### Journey: Admin service credentials
*(Conditional — skip entirely if the admin area is dropped per the spec's "no admin role".)*
- **Steps**: signed in as an `ADMIN` → `/admin/settings`.
- **Expected outcomes**:
  - **UI-044** one section per provisioned service (`postgresql`, `minio`), each with a
    configured/unconfigured badge and a credential form.
  - **UI-046** submitting `minio` credentials flips its badge to configured and the banner disappears
    after a reload.
- **Negative path**: **UI-045** while `minio` is unconfigured, the page shows the literal banner
  `The following need credentials to activate: minio`.

### Journey: Deployment & frontend-serving chain
- **Steps**: build both images, `docker compose up`, then curl the running stack.
- **Expected outcomes**:
  - **UI-047** `curl /` returns `200` with `Conduit` present in the served HTML. This is the single
    highest-severity check: it verifies the built Angular bundle actually reaches the serving
    container. A blank page here fails every marker regardless of API health.
  - **UI-048** `curl /api/health/deep` returns `200` and reports the DB reachable.
- **Negative path**:
  - **UI-049** a deep link (`curl /article/some-slug`) returns the SPA shell with `200`, not a `404`
    (SPA fallback configured).
  - **UI-050** `curl /api/nosuchroute` returns a JSON `404` from Nest — it is **not** swallowed by the
    SPA fallback and does **not** return HTML. This is the `exclude: ['/api/{*path}']` /
    nginx `/api` proxy check; the Express 5 `path-to-regexp` v8 syntax means a v4-style `'/api/*'`
    would throw at boot, so a boot failure here is also a fail.

## Data integrity tests

Assert directly against Postgres after the corresponding mutation.

- **DI-001** After `POST /api/articles`: exactly one `Article` row; its `slug` is unique across the
  table and matches `^<slugified-title>-[a-z0-9]{6}$`; `createdAt`/`updatedAt` are set.
- **DI-002** After `PUT /api/articles/:slug`: the `slug` column is **byte-identical** to its
  pre-update value and `updatedAt` has advanced while `createdAt` has not.
- **DI-003** After a rejected cross-author `PUT`/`DELETE` (403): the `Article` row's `title`,
  `description`, `body` and `updatedAt` are all unchanged — the 403 short-circuits before any write.
- **DI-004** After `DELETE /api/articles/:slug`: zero `Comment`, `ArticleTag` and `Favorite` rows
  reference the deleted `articleId` (cascades fired), while the referenced `Tag` and `User` rows survive.
- **DI-005** After deleting a `User`: their `Article` and `Comment` rows are cascade-deleted and no
  orphan rows retain a dangling `authorId`.
- **DI-006** Favorites: `favoritesCount` in every API response equals `SELECT count(*) FROM "Favorite"
  WHERE "articleId" = …`; double-favorite yields one row (`@@id([userId,articleId])` holds);
  the count is never negative after repeated unfavorites.
- **DI-007** Follows: double-follow yields exactly one `Follow` row (`@@id([followerId,followedId])`);
  unfollow deletes exactly that row and no other user's follow edges.
- **DI-008** Tags: creating two articles that both use `dragons` yields **one** `Tag` row named
  `dragons` and two `ArticleTag` rows (`connectOrCreate`, not blind create).
- **DI-009** Seed idempotency: running the seed **twice** against a populated database succeeds both
  times with no unique-constraint error, and the row counts for `User`, `Article`, `Comment` and `Tag`
  are identical after the second run. Additionally, every `User` upserted from
  `COLOSSUS_ACCOUNTS_JSON` has a non-null unique `username`, and no plaintext password or secret
  value appears in the seed's stdout.
- **DI-010** File-size budget from `surface.json`: no source file under `backend/src`,
  `frontend/src` or `backend/prisma` exceeds `hardLimit` 500 lines, and files exceeding
  `maxLines` 400 are reported as warnings.

## Out of scope

- **`GET /trpc/users.findAll` and `GET /trpc/users.findById`** (both listed in `surface.json`) — the
  sample tRPC router is explicitly retired by the `backend_agent` task list and replaced by the REST
  `/api` contract. No tests are written against them. If `TrpcAppModule` remains mounted, the only
  requirement is that the app still boots (covered implicitly by API-101).
- **The scaffold `app-home` component and its `users-list` / `users-loading` / `users-error` test ids** —
  removed by `ui_agent`. Their *absence* is asserted (UI-001) via the `reject_signatures` contract;
  their behaviour is not.
- **`GET /api/docs` (Swagger)** — preserved as the platform probe path, but its content is not under
  test; the spec is silent on API documentation.
- **`MANAGER` role behaviour** — the enum value is retained for the platform contract but tasks.md
  notes it has no product behaviour attached. Nothing to assert until a behaviour is specified.
- **minio / file upload** — provisioned as a backing service and surfaced for credential configuration
  only (API-092…100). The spec declares no upload feature (article images are URLs), so no upload,
  storage or image-processing tests exist.
- **Markdown rendering of article bodies** — the spec says "markdown-free body render", so body text
  is asserted as plain text; no markdown-to-HTML behaviour is tested.
- **Password-reset, email verification, refresh tokens, token revocation/logout-server-side** — the
  spec defines only register/login/current-user/update. JWT expiry is asserted (API-017) but there is
  no revocation list to test.
- **Rate limiting, CSRF, CORS specifics** — the spec is silent. Note the scaffold currently enables
  CORS against `FRONTEND_URL`; whether that stays depends on the unresolved one-container vs
  two-container question, so no CORS assertion is written.
- **k8s manifests (`k8s/*.yaml`)** — not applied in CI. The probe *endpoints* they depend on are
  tested (API-101…105); the manifests themselves are not validated against a live cluster.
- **Angular version upgrade (19 → 20)** — an open question in `tasks.md`. Tests assert rendered
  behaviour only and are version-agnostic; no test asserts a framework version.
- **Accessibility, responsive layout, visual regression, i18n** — the spec specifies no requirements.
  Note only that the four acceptance markers must be plain static template text (never interpolated
  or i18n-indirected) so marker grep succeeds; UI-001 asserts the rendered result.
