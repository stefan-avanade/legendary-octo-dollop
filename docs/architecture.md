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
- Activity tracking approach: Reject malformed `userId` or `teamId` with 400. Use a 24-character hex check (`/^[a-f\d]{24}$/i`) rather than `Types.ObjectId.isValid`, which also accepts any 12-character string. Reject well-formed IDs that match no record with 404. Compute `points` from `type` and `minutes` in the service, and set `occurredAt` to the current time.
- Team management approach: Reject a missing `name` with 400. Store `name`, `mascot`, and `members` as submitted. List teams unchanged.
- Data integrity decisions: `User.email` is unique, valid, lowercased, and trimmed; `User.team` is required; `User.fitnessGoal` is `endurance`, `strength`, or `mobility`. `Team.name` is unique and trimmed. `Activity.type` is one of `run`, `cycle`, `strength`, `walk`; `Activity.minutes` is 1–1440; `Activity.points` ≥ 0; `Activity.occurredAt` cannot be more than 5 minutes in the future. `Workout.title` is required; `Workout.difficulty` is `easy`, `moderate`, or `hard`. `Activity.team` is a snapshot of the user's team at creation. `User.team` is the source of truth for membership, and `Team.members` mirrors it through `setUserTeam` in `src/services/membership.ts`.
- Team mismatch decision: when an activity's `teamId` differs from the user's current team, `POST /api/activities` rejects with 400. Implement this with the endpoint.
- Leaderboard approach: Aggregate activity points by team, join the team name, sort by `totalPoints` descending with `teamName` ascending as the tie-breaker, and assign a 1-based `rank` by position.
- Workout suggestions approach: Look up the user by email and return 404 if none matches. Derive `focus` from the user's `fitnessGoal`, falling back to the most frequent recent activity type. Return the first suggestion with `focus`, `title`, and a `reason`.
- Implementation order: (1) data-tier validators, since seed data must still pass; (2) logic-tier endpoints in the order team creation, activity creation, leaderboard, workout suggestions; (3) frontend error and empty states, which can proceed in parallel with steps 1–2 because the component tests stub `fetch`; (4) the workouts component, once the suggestions response shape from step 2 is settled; (5) builds.

## Test plan

Record the commands you run and what each failure means. Results below are from the starter baseline, before any implementation.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Baseline: 4 of 5 fail (1 passes: seeding is idempotent). `expected undefined to be defined` means a required validator is missing on that model. The four failing tests map to `User`, `Team`, `Activity`, and `Workout`.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Baseline: 4 of 4 fail. `expected 501 to be 400` means the create-endpoint stub is still in place. `expected [] to deeply equal` on the leaderboard means `getLeaderboard` is still a stub. A workout mismatch means `suggestWorkouts` ignores the user: it returns no `reason` and the wrong data.
- Frontend command: `npm test --prefix octofit-tracker/frontend -- --run`
  - Baseline: 15 of 15 fail. `Unable to find role="alert"` means the error state is missing. `Unable to find ... no activities/teams/...` means the empty state is missing. `Implementation pending` means the workout component is still a stub.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Baseline: passes (`tsc --noEmit`). A type error here after a model or service change means the contract types drifted.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Baseline: passes (`tsc --noEmit && vite build`). The build output goes to `dist/`, which is gitignored.
