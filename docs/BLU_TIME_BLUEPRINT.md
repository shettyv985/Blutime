# blu-time Product Blueprint

## Purpose

blu-time is a company operations system that starts with time tracking and grows into workload intelligence, leave coverage, reporting, and eventually deliverable scheduling.

The first release must not be treated as a temporary timer app. The timer module is the foundation for future planning features, so the data model and permissions must stay clean from day one.

## Product Direction

### MVP

The MVP tracks real work against Basecamp tasks or unplanned work.

Employees can:

- sign in with an admin-created email/password account
- see tasks assigned to their mapped Basecamp person ID
- see only Basecamp tasks that are due today or overdue
- pick an unplanned task when work is not in Basecamp
- choose a category for every task
- auto-fill the client/project when a Basecamp task is selected
- select a client/project manually for unplanned tasks
- run up to 5 active timers
- pause, resume, and stop timers
- provide a mandatory `Output / Summary` for every stopped timer
- see clickable links inside saved output text
- edit saved logs forever
- see their own time history

Admins can:

- manage users and role/department mapping
- map each user to a Basecamp person ID
- manage categories
- manage clients/projects
- see live active timers
- see all saved logs
- see simultaneous work notes
- mark people on leave
- expose leave-cover tasks to people in the same role
- view daily, weekly, monthly, and project reports
- export reports as PDF
- see audit records for edited time logs

### Explicit MVP Non-Goals

These features are important, but they are not part of the first build:

- bandwidth rules
- capacity limits
- automatic workload distribution
- monthly deliverable scheduler
- routine generation
- account-manager email automation
- Basecamp comment posting
- Basecamp task completion
- Basecamp task reassignment
- screenshots or file proof uploads
- invoice or billing workflows

Bandwidth and scheduler features must be added later as separate modules, not mixed into timer logic.
No bandwidth fields, calculations, limits, or tables should be added in the MVP.

## User Roles

### Employee

Normal employees include editors, designers, content writers, production, SEO, website team members, account managers, HR, and operations users when they are logging their own work.

An employee can only see:

- their own active timers
- their own logs
- their assigned Basecamp tasks
- eligible leave-cover tasks for their role
- clients/projects needed to log unplanned work

### Lead / Account Manager

A lead can see:

- their assigned clients
- anyone who has worked on those clients
- logs, reports, and active work related to those clients

Leads must not automatically see every company user's private work unless that work belongs to their client scope.

### HR / Operations

HR and operations can see all data needed for company operations:

- all users
- all logs
- all active timers
- leave records
- audit history
- reports

### Boss

Boss users can see all company data and all reports.

## Core Data Objects

### User

Represents a blu-time login.

Required fields:

- name
- email
- password hash
- role
- department
- active/inactive status
- Basecamp person ID
- created at
- updated at

### Department

Examples:

- editor
- designer
- content writer
- production
- account manager
- SEO
- website
- HR
- operations
- boss

Departments are used for leave coverage and reporting. They must not include bandwidth limits in MVP.

### Client

A client usually maps to a Basecamp project/bucket.

Required fields:

- name
- Basecamp project/bucket ID when available
- active/inactive status

### Task

A task can come from Basecamp or be created as an unplanned work entry.

Basecamp task fields to snapshot when time is logged:

- Basecamp task ID
- Basecamp task type
- Basecamp parent ID if child step
- task title/content
- task app URL
- client/project ID
- client/project name
- due date

Unplanned task fields:

- task title entered by user
- category
- client/project selected by user

### Category

Every time entry must have a category.

Default categories:

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

Admins can add, rename, disable, and reorder categories.

### Active Timer

Represents currently running or paused work.

Required fields:

- user ID
- task source: Basecamp or unplanned
- task snapshot
- category ID
- client ID
- started at
- running since
- elapsed before pause
- status: running or paused
- heartbeat timestamp

Active timers must live in the database, not only in browser localStorage. This lets admins see live timers and lets the server auto-close abandoned timers after the heartbeat timeout.

### Time Entry

Represents stopped and saved work.

Required fields:

- user ID
- task snapshot
- category ID
- client ID
- started at
- ended at
- total seconds
- output/summary
- simultaneous work note
- created at
- updated at

The output/summary is mandatory.

### Simultaneous Work Note

When a user stops a timer, blu-time checks what other timers overlapped with that timer.

The saved log card should show a small note like:

`Simultaneously worked on: Client B - AI Video, Client C - Revision`

This avoids confusing users with technical report language while still keeping the truth visible.

### Leave Record

Represents planned or unplanned absence.

Required fields:

- user ID
- date range
- reason
- created by
- created at

When a user is on leave, their due today and overdue Basecamp tasks can be shown to other active users in the same department.

### Audit Log

Records important changes.

Must capture:

- actor user ID
- entity type
- entity ID
- action
- before values
- after values
- timestamp

Time entry edits must be audited, but employees do not need to enter an edit reason in MVP.

## Basecamp Integration

blu-time uses one company/admin Basecamp connection.

Each blu-time user is mapped to a Basecamp person ID. The app uses that mapping to fetch tasks for the right person.

Task dropdown rules:

- show active tasks assigned to the current user's Basecamp person ID
- include due today
- include overdue
- hide tasks without due dates
- support child steps
- allow unplanned work when the task is not in Basecamp

For child steps:

- child steps should be selectable
- child logs should roll up under the parent in reports
- the UI should show child steps indented under the parent

Basecamp data should be fetched live for task lists. Time entries should still store a snapshot of the selected task so historical reports remain stable even if Basecamp later changes.

## Timer Rules

- max 5 active timers per user
- every active timer can be running or paused
- pause/resume excludes paused duration from total time
- browser close should not keep a timer alive forever
- a heartbeat should update while the browser is open
- if heartbeat expires, the backend should auto-stop or mark the timer abandoned
- stopping a timer requires `Output / Summary`
- links in output text should render clickable

Recommended heartbeat timeout: 2 minutes after the last browser heartbeat.

## Reporting Rules

Reports must support:

- employee-wise time
- client-wise time
- task-wise time
- category-wise time
- daily reports
- weekly reports
- monthly reports
- project/client reports
- PDF export

Reports must show simultaneous work notes where relevant.

## Future Scheduler Module

The future scheduler should be built after the time tracking foundation is stable.

Future scheduler goals:

- define monthly client deliverables
- generate a routine for each client
- distribute work based on people, availability, task type, and future planning constraints
- avoid overloading editors, designers, writers, and production
- help account managers assign content calendars on the right days
- email account managers with the generated routine

This module should use time logs, clients, departments, and leave records. It should not be hard-coded into the timer module.

## Stability Principles

- Keep timer logic separate from scheduler logic.
- Keep Basecamp integration separate from reporting logic.
- Store historical snapshots for time entries.
- Do not rely on localStorage for critical data.
- Do not mix permissions into UI only. Enforce permissions on the server.
- Add audit logs for all admin-sensitive changes.
- Prefer small modules over one large page file.
- Use explicit database migrations.
- Treat reports as read models built from stable source tables.
