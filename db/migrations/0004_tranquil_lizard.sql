CREATE TABLE `planner_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`deliverable_id` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`planned_week` integer NOT NULL,
	`writer_user_id` text,
	`writer_date` text,
	`writer_completed_at` text,
	`designer_user_id` text,
	`designer_date` text,
	`designer_completed_at` text,
	`production_user_id` text,
	`production_date` text,
	`production_completed_at` text,
	`editor_user_id` text,
	`editor_date` text,
	`editor_completed_at` text,
	`basecamp_task_id` text,
	`basecamp_task_url` text,
	`basecamp_task_title` text,
	`completed_at` text,
	`completed_by_user_id` text,
	`completed_from_time_entry_id` text,
	`override_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`deliverable_id`) REFERENCES `monthly_plan_deliverables`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`writer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`designer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`production_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`editor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_from_time_entry_id`) REFERENCES `time_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `planner_assignments_deliverable_id_unique` ON `planner_assignments` (`deliverable_id`);--> statement-breakpoint
CREATE INDEX `planner_assignments_status_idx` ON `planner_assignments` (`status`);--> statement-breakpoint
CREATE INDEX `planner_assignments_planned_week_idx` ON `planner_assignments` (`planned_week`);--> statement-breakpoint
CREATE INDEX `planner_assignments_writer_user_id_idx` ON `planner_assignments` (`writer_user_id`);--> statement-breakpoint
CREATE INDEX `planner_assignments_designer_user_id_idx` ON `planner_assignments` (`designer_user_id`);--> statement-breakpoint
CREATE INDEX `planner_assignments_production_user_id_idx` ON `planner_assignments` (`production_user_id`);--> statement-breakpoint
CREATE INDEX `planner_assignments_editor_user_id_idx` ON `planner_assignments` (`editor_user_id`);--> statement-breakpoint
CREATE INDEX `planner_assignments_completed_at_idx` ON `planner_assignments` (`completed_at`);--> statement-breakpoint
CREATE INDEX `planner_assignments_basecamp_task_id_idx` ON `planner_assignments` (`basecamp_task_id`);