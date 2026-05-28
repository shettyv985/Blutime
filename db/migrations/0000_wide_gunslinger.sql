CREATE TABLE `active_timers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`category_id` text NOT NULL,
	`task_source` text NOT NULL,
	`task_title` text NOT NULL,
	`basecamp_task_id` text,
	`basecamp_task_type` text,
	`basecamp_task_url` text,
	`basecamp_parent_id` text,
	`basecamp_parent_title` text,
	`basecamp_due_on` text,
	`started_at` text NOT NULL,
	`running_since` text,
	`elapsed_before_pause_seconds` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`last_heartbeat_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `active_timers_user_id_idx` ON `active_timers` (`user_id`);--> statement-breakpoint
CREATE INDEX `active_timers_status_idx` ON `active_timers` (`status`);--> statement-breakpoint
CREATE INDEX `active_timers_client_id_idx` ON `active_timers` (`client_id`);--> statement-breakpoint
CREATE INDEX `active_timers_category_id_idx` ON `active_timers` (`category_id`);--> statement-breakpoint
CREATE INDEX `active_timers_last_heartbeat_at_idx` ON `active_timers` (`last_heartbeat_at`);--> statement-breakpoint
CREATE INDEX `active_timers_basecamp_task_id_idx` ON `active_timers` (`basecamp_task_id`);--> statement-breakpoint
CREATE TABLE `basecamp_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`client_id_encrypted` text,
	`client_secret_encrypted` text,
	`access_token_encrypted` text,
	`refresh_token_encrypted` text,
	`token_expires_at` text,
	`connected_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`connected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `basecamp_connection_account_id_idx` ON `basecamp_connection` (`account_id`);--> statement-breakpoint
CREATE INDEX `basecamp_connection_connected_by_user_id_idx` ON `basecamp_connection` (`connected_by_user_id`);--> statement-breakpoint
CREATE TABLE `basecamp_task_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`basecamp_person_id` text NOT NULL,
	`fetched_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`payload_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `basecamp_task_cache_basecamp_person_id_idx` ON `basecamp_task_cache` (`basecamp_person_id`);--> statement-breakpoint
CREATE INDEX `basecamp_task_cache_expires_at_idx` ON `basecamp_task_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `categories_display_order_idx` ON `categories` (`display_order`);--> statement-breakpoint
CREATE INDEX `categories_is_active_idx` ON `categories` (`is_active`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`basecamp_project_id` text,
	`basecamp_project_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_name_idx` ON `clients` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_basecamp_project_id_unique` ON `clients` (`basecamp_project_id`);--> statement-breakpoint
CREATE INDEX `clients_is_active_idx` ON `clients` (`is_active`);--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `departments_slug_unique` ON `departments` (`slug`);--> statement-breakpoint
CREATE INDEX `departments_is_active_idx` ON `departments` (`is_active`);--> statement-breakpoint
CREATE TABLE `lead_client_access` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lead_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_client_access_unique` ON `lead_client_access` (`lead_user_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `lead_client_access_lead_user_id_idx` ON `lead_client_access` (`lead_user_id`);--> statement-breakpoint
CREATE INDEX `lead_client_access_client_id_idx` ON `lead_client_access` (`client_id`);--> statement-breakpoint
CREATE TABLE `leave_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`reason` text,
	`created_by_user_id` text NOT NULL,
	`cancelled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leave_records_user_id_idx` ON `leave_records` (`user_id`);--> statement-breakpoint
CREATE INDEX `leave_records_starts_on_idx` ON `leave_records` (`starts_on`);--> statement-breakpoint
CREATE INDEX `leave_records_ends_on_idx` ON `leave_records` (`ends_on`);--> statement-breakpoint
CREATE INDEX `leave_records_cancelled_at_idx` ON `leave_records` (`cancelled_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`category_id` text NOT NULL,
	`task_source` text NOT NULL,
	`task_title` text NOT NULL,
	`basecamp_task_id` text,
	`basecamp_task_type` text,
	`basecamp_task_url` text,
	`basecamp_parent_id` text,
	`basecamp_parent_title` text,
	`basecamp_due_on` text,
	`started_at` text NOT NULL,
	`ended_at` text NOT NULL,
	`total_seconds` integer NOT NULL,
	`output_summary` text NOT NULL,
	`simultaneous_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `time_entries_user_id_idx` ON `time_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `time_entries_client_id_idx` ON `time_entries` (`client_id`);--> statement-breakpoint
CREATE INDEX `time_entries_category_id_idx` ON `time_entries` (`category_id`);--> statement-breakpoint
CREATE INDEX `time_entries_started_at_idx` ON `time_entries` (`started_at`);--> statement-breakpoint
CREATE INDEX `time_entries_ended_at_idx` ON `time_entries` (`ended_at`);--> statement-breakpoint
CREATE INDEX `time_entries_basecamp_task_id_idx` ON `time_entries` (`basecamp_task_id`);--> statement-breakpoint
CREATE INDEX `time_entries_basecamp_parent_id_idx` ON `time_entries` (`basecamp_parent_id`);--> statement-breakpoint
CREATE TABLE `time_entry_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`time_entry_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`time_entry_id`) REFERENCES `time_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `time_entry_audit_logs_time_entry_id_idx` ON `time_entry_audit_logs` (`time_entry_id`);--> statement-breakpoint
CREATE INDEX `time_entry_audit_logs_actor_user_id_idx` ON `time_entry_audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `time_entry_audit_logs_created_at_idx` ON `time_entry_audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`access_role` text NOT NULL,
	`department_id` text,
	`basecamp_person_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_access_role_idx` ON `users` (`access_role`);--> statement-breakpoint
CREATE INDEX `users_department_id_idx` ON `users` (`department_id`);--> statement-breakpoint
CREATE INDEX `users_basecamp_person_id_idx` ON `users` (`basecamp_person_id`);--> statement-breakpoint
CREATE INDEX `users_is_active_idx` ON `users` (`is_active`);