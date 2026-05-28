CREATE TABLE `client_team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`team_role` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_team_members_unique` ON `client_team_members` (`client_id`,`user_id`,`team_role`);--> statement-breakpoint
CREATE INDEX `client_team_members_client_id_idx` ON `client_team_members` (`client_id`);--> statement-breakpoint
CREATE INDEX `client_team_members_user_id_idx` ON `client_team_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `client_team_members_team_role_idx` ON `client_team_members` (`team_role`);--> statement-breakpoint
CREATE TABLE `monthly_plan_deliverables` (
	`id` text PRIMARY KEY NOT NULL,
	`monthly_plan_id` text NOT NULL,
	`service_line` text NOT NULL,
	`deliverable_type` text NOT NULL,
	`sequence` integer NOT NULL,
	`title` text NOT NULL,
	`shoot_required` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`monthly_plan_id`) REFERENCES `monthly_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_plan_deliverables_unique` ON `monthly_plan_deliverables` (`monthly_plan_id`,`service_line`,`deliverable_type`,`sequence`);--> statement-breakpoint
CREATE INDEX `monthly_plan_deliverables_plan_id_idx` ON `monthly_plan_deliverables` (`monthly_plan_id`);--> statement-breakpoint
CREATE INDEX `monthly_plan_deliverables_service_line_idx` ON `monthly_plan_deliverables` (`service_line`);--> statement-breakpoint
CREATE INDEX `monthly_plan_deliverables_type_idx` ON `monthly_plan_deliverables` (`deliverable_type`);--> statement-breakpoint
CREATE TABLE `monthly_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`month_key` text NOT NULL,
	`social_static_count` integer DEFAULT 10 NOT NULL,
	`social_carousel_count` integer DEFAULT 0 NOT NULL,
	`social_reel_edit_count` integer DEFAULT 5 NOT NULL,
	`social_ai_video_count` integer DEFAULT 0 NOT NULL,
	`performance_static_count` integer DEFAULT 10 NOT NULL,
	`performance_carousel_count` integer DEFAULT 0 NOT NULL,
	`performance_reel_edit_count` integer DEFAULT 5 NOT NULL,
	`performance_ai_video_count` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_plans_client_month_unique` ON `monthly_plans` (`client_id`,`month_key`);--> statement-breakpoint
CREATE INDEX `monthly_plans_client_id_idx` ON `monthly_plans` (`client_id`);--> statement-breakpoint
CREATE INDEX `monthly_plans_month_key_idx` ON `monthly_plans` (`month_key`);--> statement-breakpoint
ALTER TABLE `clients` ADD `service_type` text DEFAULT 'unset' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `lead_user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `clients_service_type_idx` ON `clients` (`service_type`);--> statement-breakpoint
CREATE INDEX `clients_lead_user_id_idx` ON `clients` (`lead_user_id`);