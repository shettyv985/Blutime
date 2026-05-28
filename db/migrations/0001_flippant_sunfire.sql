ALTER TABLE `time_entries` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `deleted_by_user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `time_entries_deleted_at_idx` ON `time_entries` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `time_entries_deleted_by_user_id_idx` ON `time_entries` (`deleted_by_user_id`);