# blu-time Technical Decisions

## Current Workspace Finding

The existing `blutime-link` app is a Next.js prototype using Supabase. It already contains timer, admin, routine, member, campaign, and availability code.

Important concerns in the current prototype:

- active timers are stored in browser localStorage
- a large amount of business logic lives inside `app/page.tsx`
- routine/capacity logic is mixed with timer logic
- Supabase is used even though the preferred free-first database direction is now Turso
- existing capacity/bandwidth-style code should not drive the MVP

This code can be used as reference, but it should not be treated as final production architecture.

## Recommended Stack

For the free-first MVP:

- Next.js
- TypeScript
- Turso/libSQL
- Drizzle ORM
- server-side auth with admin-created users
- Basecamp integration through server-side API routes/services

Reasoning:

- Turso has more free storage headroom than the common free Postgres options.
- SQLite/libSQL is enough for the first 60-user operations app if the schema is indexed well.
- Drizzle keeps migrations explicit and readable.
- Next.js works on Vercel and keeps frontend/backend in one codebase.

## Free Hosting Reality

There is no reliable free, unlimited, production-grade database.

The system should start free where possible, but must be designed for migration later. Critical company data should not depend forever on a free tier with no serious backups.

## Architecture Shape

Recommended folders:

```text
app/
  (auth)/
  (employee)/
  (admin)/
  api/
components/
  employee/
  admin/
  shared/
server/
  auth/
  basecamp/
  timers/
  time-entries/
  reports/
  leave/
  permissions/
db/
  schema.ts
  migrations/
docs/
```

## Module Boundaries

### Auth

Handles:

- email/password login
- admin-created users
- sessions
- password hashing
- active/inactive users

Auth must not depend on Basecamp login.

### Basecamp

Handles:

- company/admin Basecamp token
- fetching assigned tasks by Basecamp person ID
- due today and overdue filtering
- child step normalization
- project/client mapping

Basecamp code must be isolated so API changes do not break timer code directly.

### Timers

Handles:

- max 5 active timers
- start
- pause
- resume
- stop
- heartbeat
- abandoned timer cleanup
- overlap detection

Timer code must not include scheduler or bandwidth logic.

### Time Entries

Handles:

- saved work logs
- mandatory output/summary
- clickable link rendering
- edits
- audit logging

### Reports

Handles:

- daily, weekly, monthly, project reports
- employee/client/task/category grouping
- PDF export

Reports should read from time entries and related snapshots.

### Leave

Handles:

- leave records
- same-role task visibility for leave coverage
- later recommendation logic

In MVP, leave coverage can exist without bandwidth rules.

### Scheduler

Future module only.

It should be added after the timer, reporting, and leave foundations are stable.

## Suggested Database Tables

Initial MVP tables:

- users
- sessions
- roles
- departments
- clients
- categories
- basecamp_connection
- basecamp_person_mappings
- active_timers
- time_entries
- time_entry_audit_logs
- leave_records
- lead_client_access

Future tables:

- deliverable_rules
- schedule_plans
- schedule_items
- email_notifications

## Implementation Order

1. Freeze blueprint and schema.
2. Replace prototype data access with a clean database layer.
3. Implement auth and admin-created users.
4. Implement users, roles, departments, clients, and categories.
5. Implement Basecamp connection and task fetching.
6. Implement database-backed active timers.
7. Implement stop flow with mandatory output/summary.
8. Implement simultaneous work notes.
9. Implement employee history and edits.
10. Implement admin live dashboard.
11. Implement reports and PDF export.
12. Implement leave records and same-role coverage visibility.

## Quality Rules

- No critical timer state only in localStorage.
- No one-file application logic.
- No scheduler logic in MVP timer code.
- No bandwidth fields, tables, calculations, or enforcement in MVP.
- No client-side-only permission enforcement.
- Every sensitive mutation should pass through server-side permission checks.
- Every time entry edit should create an audit log.
- Every database change should be represented in migrations.
