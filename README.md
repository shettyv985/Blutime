# BluTime

BluTime is Blusteak's internal operations workspace for time tracking, Basecamp task visibility, production planning, team reporting, and AI-assisted operational analysis.

It is a full-stack Next.js application backed by Turso/libSQL and Drizzle ORM. Employees use it to record work and review their plans; leads and operations users use it to coordinate delivery; HR and leadership use it to monitor work, manage users, and analyze company data.

## What the application does

### Time tracking

- Starts timers for Basecamp tasks or unplanned work.
- Supports up to five active timers per employee.
- Allows timers to be paused and resumed.
- Automatically pauses a timer when it reaches four hours.
- Requires an output/summary before a timer can be stopped.
- Records an optional NOKK quality score from 1–10, or `NA`.
- Stores active timers in the database, so timer state is not lost when a page is refreshed.
- Captures a note when other timers were active at the time a timer was stopped.

### Work logs

- Gives employees a date-filtered history of their own work.
- Lets employees export their visible history through the browser's PDF print flow.
- Lets employees edit task names, summaries, NOKK scores, and start/end times.
- Soft-deletes logs instead of immediately removing their database records.
- Writes audit records when saved logs are edited or deleted.
- Turns URLs in output summaries into clickable links.

### Basecamp integration

- Maps each BluTime user to a Basecamp person ID.
- Refreshes the company Basecamp access token on the server.
- Shows an employee's assigned tasks that are due today or overdue.
- Preserves task, parent task, project, URL, and due-date snapshots in time logs.
- Supports child tasks/steps.
- Lets authorized leads, account managers, HR/operations users, and bosses inspect another team member's assigned tasks.

### Company dashboard and reports

- Shows live running and paused timers across the company.
- Shows the current day's saved logs and average NOKK score.
- Allows authorized users to remove an invalid active timer.
- Filters reports by date range, employee, client, and category.
- Groups totals by employee, client, and category.
- Supports today, last seven days, last 30 days, and custom ranges.
- Exports the visible report through the browser's PDF print flow.
- Allows HR/operations and bosses to correct or delete company logs.

### Production planner

- Maintains month-specific client plans for the `ROBISH`, `RELSA`, and `RESHMA` production pods.
- Records each client's service type, video/static targets, and assigned writers, designers, and editors.
- Generates week-by-week and day-by-day production allocations.
- Applies role capacity, shoot-day, buffer-week, direct-edit, and cross-pod rules.
- Saves plans to the database and exposes relevant planner tasks to employees.
- Lets authorized users download the generated plan as an Excel-compatible `.xls` workbook.
- Includes a lower-level monthly deliverable and assignment engine in the database/API for social and performance deliverables.

The dashboard currently uses the production-workbook planner at `/api/production-workbook`. The more granular `/api/admin/planner` and `/api/admin/planner/suggestions` endpoints are retained as a second planner foundation for deliverable generation and assignment suggestions.

### AI Master Brain

- Creates saved, user-owned AI chat sessions.
- Can use Manus or OpenAI as the model provider.
- Builds context from the last 60 days of non-deleted BluTime logs.
- Adds users, clients, work totals, categories, and selected Basecamp pending tasks to the prompt.
- Reads selected Google Sheets as structured context.
- Stores and attaches files up to 5 MB each.
- Extracts text from text-like files and can send original files to Manus.
- Supports attached links, follow-up messages, asynchronous Manus tasks, and generated attachments.

AI access is restricted to bosses and users with the `hr_ops` role whose department slug is `hr`.

### User and category administration

- Creates and updates employee logins.
- Assigns access roles and departments.
- Activates or deactivates users.
- Maps users to Basecamp person IDs.
- Stores optional profile-photo URLs, including Google Drive links.
- Creates, renames, activates, and hides timer categories.

## Access model

The application enforces access in server routes as well as in the UI.

| Role or group | Main access |
| --- | --- |
| Employee | Own timers, Basecamp tasks, planner highlights, and work-log history |
| Lead | Employee features plus planner and team task views |
| Account Manager department | Planner, team search, and team task views in addition to personal work |
| HR / Operations | Company dashboard, reports, planner, user management, and category management |
| Boss | All operational modules, including the AI Master Brain |
| `hr_ops` role in the `hr` department | AI Master Brain access in addition to HR/operations access |

The four stored access-role values are `employee`, `lead`, `hr_ops`, and `boss`. Department membership adds a small amount of contextual access, particularly for account managers and HR.

## Typical workflow

1. An administrator seeds the first boss account and creates the remaining users.
2. Each employee is assigned a department and, when needed, a Basecamp person ID.
3. The employee signs in and starts a timer from a Basecamp task or creates an unplanned timer.
4. The employee pauses/resumes work as needed, adds an output summary and NOKK score, and stops the timer.
5. BluTime turns the timer into a permanent time entry and keeps a snapshot of the external task data.
6. HR/operations and bosses review live work, reports, grouped totals, and corrections.
7. Leads and operations users build monthly production plans; employees see their assigned planner dates.
8. Authorized leadership users can ask the AI Master Brain questions across BluTime, Basecamp, Google Sheets, and uploaded files.

## Architecture

```text
Browser
  |
  |  React client components and fetch requests
  v
Next.js App Router
  |
  |-- app/page.tsx                 Authenticated server-rendered dashboard
  |-- app/api/auth/*               Login, logout, current session
  |-- app/api/work/*               Timers and time entries
  |-- app/api/basecamp/*           Basecamp task access
  |-- app/api/production-workbook  Active production planner persistence
  |-- app/api/admin/*              Reports, users, planner, and AI
  |
  v
Server modules
  |-- server/auth                  Sessions, passwords, permissions
  |-- server/basecamp              Basecamp OAuth refresh and API normalization
  |-- server/timers                Elapsed-time and auto-pause rules
  |-- server/ai                    Provider, Google Sheets, file, and context logic
  |
  v
Drizzle ORM -> Turso/libSQL
```

The root page is forced to dynamic rendering because it reads the current session and live operational data on every request.

## Technology stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Turso/libSQL
- Drizzle ORM and Drizzle Kit
- Server-managed email/password authentication
- bcrypt password hashing
- Basecamp API
- Manus API and OpenAI Responses API
- Google Sheets API
- Radix UI, Lucide icons, Three.js, and React Three Fiber

## Getting started

### Requirements

- Node.js 20.9 or newer
- npm
- A Turso database, or a local libSQL/SQLite file

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

Create or update `.env` in the repository root. A minimal local setup is:

```dotenv
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=

SEED_BOSS_NAME=Boss
SEED_BOSS_EMAIL=boss@example.com
SEED_BOSS_PASSWORD=replace-with-a-strong-password

# Reserved server secret. Keep this set for server-side secret configuration.
SESSION_SECRET=replace-with-a-long-random-value
```

Generate a random secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not commit `.env` files. They are ignored by Git.

### 3. Apply database migrations

```bash
npm run db:migrate
```

### 4. Seed defaults and the first boss user

```bash
npm run db:seed
```

The seed is safe to run again. It creates or updates:

- Default departments
- Default timer categories
- The boss user configured by `SEED_BOSS_*`

If the boss email or password variables are omitted, departments and categories are still seeded, but boss-user creation is skipped.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seeded boss account.

## Environment variables

### Core database and authentication

| Variable | Required | Purpose |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | Yes | Turso URL or local `file:` database URL |
| `TURSO_AUTH_TOKEN` | Hosted Turso only | Authentication token for the Turso database |
| `SESSION_SECRET` | Recommended | Reserved server secret for authentication/security configuration |
| `SEED_BOSS_NAME` | No | Display name used by the seed script |
| `SEED_BOSS_EMAIL` | To seed a boss | Email used to create or update the first boss |
| `SEED_BOSS_PASSWORD` | To seed a boss | Password used to create or update the first boss |

### Basecamp

| Variable | Required for Basecamp | Purpose |
| --- | --- | --- |
| `BASECAMP_ACCOUNT_ID` | Yes | Company Basecamp account ID |
| `BASECAMP_CLIENT_ID` | Yes | Basecamp OAuth client ID |
| `BASECAMP_CLIENT_SECRET` | Yes | Basecamp OAuth client secret |
| `BASECAMP_REFRESH_TOKEN` | Yes | Refresh token used to obtain short-lived access tokens |

Basecamp credentials are only read in server code. Individual users do not sign in with Basecamp; administrators map BluTime users to Basecamp person IDs.

### AI providers

| Variable | Required | Purpose |
| --- | --- | --- |
| `MANUS_API_KEY` | For Manus | Enables Manus tasks and file uploads |
| `MANUS_AGENT_PROFILE` | No | Manus profile; defaults to `manus-1.6-lite` |
| `OPENAI_API_KEY` | For OpenAI | Enables synchronous OpenAI responses |
| `OPENAI_MODEL` | No | OpenAI model; defaults to `gpt-5-mini` |

If no provider is explicitly requested, BluTime prefers Manus when `MANUS_API_KEY` exists and otherwise selects OpenAI.

### Google Sheets

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | One Google auth method | Service-account email for private sheets |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | With service-account email | PKCS#8 private key; escaped `\n` values are supported |
| `GOOGLE_SHEETS_API_KEY` | Alternative auth method | API-key access, mainly for publicly readable sheets |
| `AI_SHEET_MAX_ROWS` | No | Maximum rows included from each sheet tab; defaults to `300` |

For private sheets, share the spreadsheet with the configured service-account email.

### Legacy Supabase variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are referenced only by the retained `lib/supabase.ts` prototype helper. The current application data path uses Turso and does not require these variables.

## Database model

The canonical schema is [`db/schema.ts`](db/schema.ts). Migrations live in [`db/migrations`](db/migrations).

### Identity and configuration

- `departments` — department names and slugs
- `users` — login identity, role, department, Basecamp mapping, photo, and active status
- `sessions` — hashed 30-day session tokens and revocation state
- `categories` — timer categories and display state
- `clients` — clients/projects, service type, lead, and account manager
- `lead_client_access` — explicit lead-to-client visibility
- `client_team_members` — writer, designer, and editor assignments per client

### Time tracking

- `active_timers` — running/paused database-backed timers
- `time_entries` — completed work, summaries, NOKK scores, and task snapshots
- `time_entry_audit_logs` — before/after data for edits and deletions
- `leave_records` — absence records retained for operational coverage features
- `basecamp_connection` and `basecamp_task_cache` — integration-oriented storage

### Planning

- `production_workbook_plans` — current pod-based monthly plans
- `monthly_plans` — monthly client deliverable counts
- `monthly_plan_deliverables` — generated social/performance deliverables
- `planner_assignments` — role owners, dates, statuses, and Basecamp completion links

### AI

- `ai_sheet_sources` — saved Google Sheet sources
- `ai_file_sources` — uploaded files, base64 storage, and extracted text
- `ai_chat_sessions` — chat messages, selected context, provider, and Manus task state

## Authentication and security

- Accounts are admin-created; there is no public signup route.
- Passwords are hashed with bcrypt using cost factor 12.
- Login creates a random 32-byte session token.
- Only the SHA-256 hash of the session token is stored in the database.
- Session cookies are HTTP-only, `SameSite=Lax`, and secure in production.
- Sessions expire after 30 days and can be revoked on logout.
- Inactive users cannot create valid sessions.
- Sensitive API handlers check the current user and permission helpers on the server.
- External API keys and database credentials must remain server-only.

Uploaded AI files are stored inside the database as base64. This is convenient for the current system but increases database size; use external object storage if file volume becomes significant.

## Timer and reporting rules

- A user may have at most five running or paused timers.
- A timer is automatically paused and capped at four hours.
- Stopping requires a non-empty output summary.
- NOKK must be `NA` or an integer from 1–10.
- Editing a log requires valid start/end timestamps and a duration between one second and 24 hours.
- Deleted logs are excluded from employee history, reports, dashboard totals, and AI context.
- Employee history returns up to 200 matching logs.
- The compact timer-state response includes the latest 20 logs.
- Admin reports return up to 500 logs.
- AI operational context includes up to 1,200 logs from the last 60 days.
- Report date boundaries use Indian Standard Time (`+05:30`).

## API map

### Authentication

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/auth/login` | `POST` | Verify credentials and create a session |
| `/api/auth/logout` | `POST` | Revoke the current session |
| `/api/auth/me` | `GET` | Return the current authenticated user |

### Employee work

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/work/timer-state` | `GET` | Categories, active timers, recent logs, and personal Basecamp tasks |
| `/api/work/timers` | `POST` | Start a timer |
| `/api/work/timers/:id` | `PATCH`, `DELETE` | Pause/resume an owned timer; authorized admins can delete a timer |
| `/api/work/timers/:id/stop` | `POST` | Convert a timer into a saved time entry |
| `/api/work/time-entries` | `GET` | Read the current user's log history |
| `/api/work/time-entries/:id` | `PATCH`, `DELETE` | Edit or soft-delete a log |
| `/api/basecamp/tasks` | `GET` | Read personal or authorized team Basecamp tasks |

### Administration and planning

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/admin/users` | `GET`, `POST`, `PATCH` | Manage company users |
| `/api/admin/categories` | `GET`, `POST`, `PATCH` | Manage timer categories |
| `/api/admin/reports` | `GET` | Filtered company reports and grouped totals |
| `/api/production-workbook` | `GET`, `POST` | Load and save pod-based monthly plans |
| `/api/admin/planner` | `GET`, `POST`, `PATCH` | Manage granular monthly plans and client-team settings |
| `/api/admin/planner/suggestions` | `GET`, `POST` | Generate/save assignment suggestions and refresh completions |

### AI

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/admin/ai/chat` | `POST` | Ask Manus or OpenAI with selected context |
| `/api/admin/ai/tasks/:taskId` | `GET` | Poll a Manus task |
| `/api/admin/ai/chats` | `GET`, `POST` | List or create saved chats |
| `/api/admin/ai/chats/:id` | `PATCH`, `DELETE` | Update or archive a chat |
| `/api/admin/ai/sources` | `GET`, `POST` | List or save Google Sheet sources |
| `/api/admin/ai/sources/:id` | `DELETE` | Deactivate a sheet source |
| `/api/admin/ai/files` | `GET`, `POST` | List or upload AI files |
| `/api/admin/ai/files/:id` | `DELETE` | Deactivate an uploaded file |

## Project structure

```text
app/
  api/                     Next.js route handlers
  layout.tsx               Root metadata, font, and global shell
  page.tsx                 Session gate and server-side dashboard data
components/
  admin/                   Reports, planner, AI, users, company overview
  app/                     Main dashboard and employee identity card
  auth/                    Login form
  tasks/                   Basecamp task/timer view
  timers/                  Employee timer and log panels
db/
  schema.ts                Drizzle schema and relations
  migrations/              SQL migrations and Drizzle metadata
docs/
  BLU_TIME_BLUEPRINT.md    Original product/MVP direction
  DATABASE_SCHEMA_MVP.md   Original MVP schema notes
  TECHNICAL_DECISIONS.md   Initial architecture decisions
lib/                       Shared client utilities and retained prototype helpers
scripts/
  seed-initial-data.ts     Departments, categories, and boss seed
  check-designer-allocation.ts
                            Planner capacity regression check
server/
  ai/                      AI context, files, Sheets, and providers
  auth/                    Passwords, sessions, and permissions
  basecamp/                Basecamp client and task normalization
  db/                      Database creation and singleton client
  seed/                    Default seed values
  timers/                  Timer calculations and auto-pause
types/                     Shared and compatibility type declarations
```

The files in `docs/` describe the original MVP architecture. They are useful design history, but `db/schema.ts`, the API handlers, and the active dashboard components are the source of truth for the current implementation.

Several root-level components and `lib/supabase.ts` are retained from earlier prototypes. The active dashboard is composed primarily from `components/app`, `components/timers`, `components/tasks`, and `components/admin`.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server with Turbopack |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server after a build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending database migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed defaults and the initial boss user |

The planner regression script can also be run directly:

```bash
npx tsx scripts/check-designer-allocation.ts
```

It checks daily designer capacity, multi-person coverage, dynamic pod metadata, writer fairness, and generated workbook totals.

## Making database changes

1. Update `db/schema.ts`.
2. Generate a migration:

   ```bash
   npm run db:generate
   ```

3. Review the generated SQL in `db/migrations`.
4. Apply it:

   ```bash
   npm run db:migrate
   ```

5. Run the app, lint, build, and any relevant planner checks.

Do not edit production data structures without a migration.

## Production deployment

The application is suitable for a Node.js deployment such as Vercel, provided all server environment variables are configured.

Before deploying:

1. Create the production Turso database.
2. Configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
3. Apply migrations against the production database.
4. Seed the initial boss account if the database is empty.
5. Configure Basecamp, AI, and Google credentials for the modules that will be enabled.
6. Run:

   ```bash
   npm run lint
   npm run build
   ```

7. Keep all credentials out of Git and rotate any secret that has been exposed.

Because Next.js 16 no longer runs ESLint automatically during `next build`, lint and build should be separate CI checks.

## Current limitations and design notes

- Basecamp uses one company OAuth connection rather than per-user OAuth.
- Basecamp task lists are read-only; BluTime does not complete, reassign, or comment on Basecamp tasks.
- The timer does not currently use a heartbeat-expiry cleanup rule; its active safety rule is the four-hour auto-pause.
- PDF export uses the browser print dialog rather than a server-generated PDF.
- AI files are stored in the database instead of external object storage.
- Google Sheet context is row-limited to control prompt size.
- The AI Master Brain is an internal decision-support tool and can only reason from the data supplied to it.
- The production-workbook planner is the active planner UI; the granular planner APIs are a parallel foundation and are not currently called by the dashboard.
- There is no general automated test command in `package.json`; lint, production build, and the planner regression script are the current verification tools.

## Further reading

- [`docs/BLU_TIME_BLUEPRINT.md`](docs/BLU_TIME_BLUEPRINT.md) — original product goals and MVP boundaries
- [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md) — initial architecture and stack reasoning
- [`docs/DATABASE_SCHEMA_MVP.md`](docs/DATABASE_SCHEMA_MVP.md) — original data-model specification
- [`db/schema.ts`](db/schema.ts) — current database source of truth
