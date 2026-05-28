# blu-time MVP Database Schema

This document defines the first production-minded schema for blu-time.

The MVP schema must support time tracking, Basecamp task selection, admin-created users, leave visibility, reports, and audit history. It must not include bandwidth or scheduler tables yet.

## Database Choice

Recommended MVP database:

- Turso/libSQL
- Drizzle ORM
- explicit migrations

The schema is relational and should remain portable enough to migrate to Postgres later if the product grows beyond the free-first database setup.

## Naming Rules

- Table names use snake_case plural names.
- Timestamps are stored as ISO strings or integer milliseconds consistently through the ORM layer.
- Primary keys use text UUIDs.
- Basecamp numeric IDs are stored as text to avoid JavaScript integer precision issues.
- Historical time entries store snapshots of external data.

## Tables

### users

Stores blu-time login users.

Fields:

- id: text primary key
- name: text not null
- email: text not null unique
- password_hash: text not null
- access_role: text not null
- department_id: text references departments(id)
- basecamp_person_id: text
- is_active: integer not null default 1
- created_at: text not null
- updated_at: text not null

Allowed access roles:

- employee
- lead
- hr_ops
- boss

Notes:

- Users are created by admins only.
- Self-signup is not allowed.
- Basecamp person ID is required for users who need assigned Basecamp tasks.

Indexes:

- unique lower-case email lookup
- basecamp_person_id
- department_id
- access_role

### departments

Stores team/department grouping.

Fields:

- id: text primary key
- name: text not null unique
- slug: text not null unique
- is_active: integer not null default 1
- created_at: text not null
- updated_at: text not null

Initial department examples:

- editor
- designer
- content_writer
- production
- account_manager
- seo
- website
- hr
- operations
- boss

No bandwidth fields belong here in MVP.

### sessions

Stores login sessions.

Fields:

- id: text primary key
- user_id: text not null references users(id)
- token_hash: text not null unique
- expires_at: text not null
- created_at: text not null
- revoked_at: text

Indexes:

- user_id
- expires_at
- token_hash

### clients

Stores clients/projects.

Fields:

- id: text primary key
- name: text not null
- basecamp_project_id: text unique
- basecamp_project_url: text
- is_active: integer not null default 1
- created_at: text not null
- updated_at: text not null

Notes:

- Basecamp project name is treated as the client name when auto-filling from a task.
- Unplanned work requires a client selection.

Indexes:

- name
- basecamp_project_id

### lead_client_access

Defines which clients a lead/account manager can see.

Fields:

- id: text primary key
- lead_user_id: text not null references users(id)
- client_id: text not null references clients(id)
- created_at: text not null

Constraints:

- unique lead_user_id plus client_id

Indexes:

- lead_user_id
- client_id

### categories

Stores admin-managed work categories.

Fields:

- id: text primary key
- name: text not null unique
- slug: text not null unique
- display_order: integer not null default 0
- is_active: integer not null default 1
- created_at: text not null
- updated_at: text not null

Seed categories:

- client meeting
- client call
- internal meeting
- research
- reporting
- operational work
- editing - normal
- editing - ai
- design - normal
- design - ai
- social media script writing
- performance script writing
- revision
- shoot

### basecamp_connection

Stores the company/admin Basecamp integration.

Fields:

- id: text primary key
- account_id: text not null
- client_id_encrypted: text
- client_secret_encrypted: text
- access_token_encrypted: text
- refresh_token_encrypted: text
- token_expires_at: text
- connected_by_user_id: text references users(id)
- created_at: text not null
- updated_at: text not null

Notes:

- There should usually be only one active Basecamp connection for the company.
- Secrets must never be exposed to the browser.
- Encryption should use a server-side secret from environment variables.

### active_timers

Stores running and paused timers.

Fields:

- id: text primary key
- user_id: text not null references users(id)
- client_id: text not null references clients(id)
- category_id: text not null references categories(id)
- task_source: text not null
- task_title: text not null
- basecamp_task_id: text
- basecamp_task_type: text
- basecamp_task_url: text
- basecamp_parent_id: text
- basecamp_parent_title: text
- basecamp_due_on: text
- started_at: text not null
- running_since: text
- elapsed_before_pause_seconds: integer not null default 0
- status: text not null
- last_heartbeat_at: text not null
- created_at: text not null
- updated_at: text not null

Allowed task sources:

- basecamp
- unplanned
- leave_cover

Allowed statuses:

- running
- paused
- abandoned

Rules:

- a user can have at most 5 timers with status running or paused
- paused timers have running_since as null
- running timers have running_since set
- abandoned timers should be closed or reviewed by cleanup logic

Indexes:

- user_id
- status
- client_id
- category_id
- last_heartbeat_at
- basecamp_task_id

### time_entries

Stores stopped work logs.

Fields:

- id: text primary key
- user_id: text not null references users(id)
- client_id: text not null references clients(id)
- category_id: text not null references categories(id)
- task_source: text not null
- task_title: text not null
- basecamp_task_id: text
- basecamp_task_type: text
- basecamp_task_url: text
- basecamp_parent_id: text
- basecamp_parent_title: text
- basecamp_due_on: text
- started_at: text not null
- ended_at: text not null
- total_seconds: integer not null
- output_summary: text not null
- simultaneous_note: text
- created_at: text not null
- updated_at: text not null

Rules:

- output_summary must not be blank
- total_seconds must be greater than or equal to 0
- task snapshots remain unchanged even if Basecamp changes later

Indexes:

- user_id
- client_id
- category_id
- started_at
- ended_at
- basecamp_task_id
- basecamp_parent_id

### time_entry_audit_logs

Stores edits to saved time entries.

Fields:

- id: text primary key
- time_entry_id: text not null references time_entries(id)
- actor_user_id: text not null references users(id)
- action: text not null
- before_json: text
- after_json: text
- created_at: text not null

Allowed actions:

- create
- update
- delete

Notes:

- Employees can edit logs forever in MVP.
- Admins should be able to see what changed.
- No edit reason is required in MVP.

Indexes:

- time_entry_id
- actor_user_id
- created_at

### leave_records

Stores leave/absence records.

Fields:

- id: text primary key
- user_id: text not null references users(id)
- starts_on: text not null
- ends_on: text not null
- reason: text
- created_by_user_id: text not null references users(id)
- created_at: text not null
- updated_at: text not null
- cancelled_at: text

Rules:

- leave-cover task visibility is based on department match
- same-role users can see due today and overdue tasks for users on leave
- no automatic Basecamp reassignment in MVP

Indexes:

- user_id
- starts_on
- ends_on
- cancelled_at

### basecamp_task_cache

Optional short-lived cache for Basecamp task dropdowns.

Fields:

- id: text primary key
- basecamp_person_id: text not null
- fetched_at: text not null
- expires_at: text not null
- payload_json: text not null

Notes:

- The app should fetch live where possible.
- This cache is only for resilience when Basecamp is temporarily unavailable.
- Saved time entries must not depend on this cache.

Indexes:

- basecamp_person_id
- expires_at

## Permission Model

### Employee

Can read/write:

- own active timers
- own time entries

Can read:

- own assigned Basecamp tasks
- eligible same-department leave-cover tasks
- active clients
- active categories

### Lead

Can read:

- clients in lead_client_access
- time entries for those clients
- active timers for those clients
- users who worked on those clients

Can write:

- own timers and own logs

### HR / Operations

Can read/write:

- users
- departments
- clients
- categories
- leave records
- reports

Can read:

- all active timers
- all time entries
- all audit logs

### Boss

Can read all data and manage all operational settings.

## Future-Only Tables

Do not create these in MVP:

- deliverable_rules
- schedule_plans
- schedule_items
- email_notifications

They belong to the future scheduler module after the timer foundation is stable.

