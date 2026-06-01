CREATE TABLE `ai_chat_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_user_id` text NOT NULL,
  `title` text NOT NULL,
  `provider` text DEFAULT 'manus' NOT NULL,
  `active_task_id` text,
  `active_task_url` text,
  `messages_json` text DEFAULT '[]' NOT NULL,
  `selected_source_ids_json` text DEFAULT '[]' NOT NULL,
  `selected_file_ids_json` text DEFAULT '[]' NOT NULL,
  `attached_links_json` text DEFAULT '[]' NOT NULL,
  `include_context_on_next_message` integer DEFAULT true NOT NULL,
  `is_archived` integer DEFAULT false NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ai_chat_sessions_owner_user_id_idx` ON `ai_chat_sessions` (`owner_user_id`);
--> statement-breakpoint
CREATE INDEX `ai_chat_sessions_updated_at_idx` ON `ai_chat_sessions` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `ai_chat_sessions_is_archived_idx` ON `ai_chat_sessions` (`is_archived`);
