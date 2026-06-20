CREATE TABLE `production_workbook_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`month_key` text NOT NULL,
	`pod_name` text NOT NULL,
	`service_label` text NOT NULL,
	`video_count` integer DEFAULT 0 NOT NULL,
	`static_count` integer DEFAULT 0 NOT NULL,
	`created_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_workbook_plans_client_month_unique` ON `production_workbook_plans` (`client_id`,`month_key`);--> statement-breakpoint
CREATE INDEX `production_workbook_plans_month_idx` ON `production_workbook_plans` (`month_key`);--> statement-breakpoint
CREATE INDEX `production_workbook_plans_pod_idx` ON `production_workbook_plans` (`pod_name`);