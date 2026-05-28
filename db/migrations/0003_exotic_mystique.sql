ALTER TABLE `clients` ADD `account_manager_user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `clients_account_manager_user_id_idx` ON `clients` (`account_manager_user_id`);