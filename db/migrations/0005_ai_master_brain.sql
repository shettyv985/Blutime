CREATE TABLE `ai_sheet_sources` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `sheet_url` text NOT NULL,
  `spreadsheet_id` text NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `created_by_user_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_sheet_sources_spreadsheet_id_unique` ON `ai_sheet_sources` (`spreadsheet_id`);
--> statement-breakpoint
CREATE INDEX `ai_sheet_sources_is_active_idx` ON `ai_sheet_sources` (`is_active`);
--> statement-breakpoint
CREATE INDEX `ai_sheet_sources_created_by_user_id_idx` ON `ai_sheet_sources` (`created_by_user_id`);
