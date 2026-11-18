# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep capability components in `octofit-tracker/frontend/src/components` presentational. They fetch through the shared client in `src/api/client.ts` using relative `/api` paths and render loading, error (`role="alert"`), and empty states. They contain no ordering, ranking, or suggestion logic.
- Logic tier decision: Keep `routes/api.ts` thin. Business rules live in `services/octofitService.ts`. Validation failures throw errors with a `status` of 400 or 404, which the existing error path returns. No authentication is added.
- Data tier decision: Enforce required fields with Mongoose schema validators in `src/models`. References use ObjectId types. Seed data must satisfy the same validators. Aggregation and lookup queries stay in the service layer, not in the models.
- Activity tracking approach: Reject malformed `userId` or `teamId` with 400 (`Types.ObjectId.isValid`). Reject well-formed IDs that match no record with 404. Compute `points` from `type` and `minutes` in the service, and set `occurredAt` to the current time.
- Team management approach: Reject a missing `name` with 400. Store `name`, `mascot`, and `members` as submitted. List teams unchanged.
- Leaderboard approach: Aggregate activity points by team, join the team name, sort by `totalPoints` descending with `teamName` ascending as the tie-breaker, and assign a 1-based `rank` by position.
- Workout suggestions approach: Look up the user by email and return 404 if none matches. Derive `focus` from the user's `fitnessGoal`, falling back to the most frequent recent activity type. Return the first suggestion with `focus`, `title`, and a `reason`.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Baseline: 4 of 5 fail. `expected undefined to be defined` means a required validator is missing on that model.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Baseline: 4 of 4 fail. `expected 501 to be 400` means the create-endpoint stub is still in place. `expected [] to deeply equal` on the leaderboard means `getLeaderboard` is still a stub. A workout mismatch means `suggestWorkouts` ignores the user.
- Frontend command: `npm test --prefix octofit-tracker/frontend -- --run`
  - Baseline: 15 of 15 fail. `Unable to find role="alert"` means the error state is missing. `Unable to find ... no activities/teams/...` means the empty state is missing. `Implementation pending` means the workout component is still a stub.
- Backend build command: `npm run build --prefix octofit-tracker/backend` (not yet run)
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` (not yet run)
