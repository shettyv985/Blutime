CREATE TABLE `ai_file_sources` (
  `id` text PRIMARY KEY NOT NULL,
  `filename` text NOT NULL,
  `content_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `storage_base64` text NOT NULL,
  `extracted_text` text,
  `is_active` integer DEFAULT true NOT NULL,
  `created_by_user_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_file_sources_is_active_idx` ON `ai_file_sources` (`is_active`);
--> statement-breakpoint
CREATE INDEX `ai_file_sources_created_by_user_id_idx` ON `ai_file_sources` (`created_by_user_id`);
--> statement-breakpoint
CREATE INDEX `ai_file_sources_filename_idx` ON `ai_file_sources` (`filename`);
