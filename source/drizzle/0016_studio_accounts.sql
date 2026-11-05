CREATE TABLE `studio_accounts` (
 `id` text PRIMARY KEY NOT NULL,
 `email` text NOT NULL,
 `display_name` text NOT NULL,
 `role` text NOT NULL CHECK (`role` IN ('designer','vendedor')),
 `password_salt` text NOT NULL,
 `password_hash` text NOT NULL,
 `password_iterations` integer NOT NULL,
 `verified_at` text,
 `last_verification_sent_at` text,
 `created_at` text NOT NULL,
 `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `studio_accounts_email_idx` ON `studio_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `studio_verifications` (
 `token_hash` text PRIMARY KEY NOT NULL,
 `account_id` text NOT NULL REFERENCES `studio_accounts`(`id`) ON DELETE CASCADE,
 `expires_at` text NOT NULL,
 `created_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `studio_verifications_account_idx` ON `studio_verifications` (`account_id`);--> statement-breakpoint
CREATE TABLE `studio_sessions` (
 `token_hash` text PRIMARY KEY NOT NULL,
 `account_id` text NOT NULL REFERENCES `studio_accounts`(`id`) ON DELETE CASCADE,
 `expires_at` text NOT NULL,
 `created_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `studio_sessions_account_idx` ON `studio_sessions` (`account_id`);--> statement-breakpoint
CREATE TABLE `studio_auth_limits` (
 `key` text PRIMARY KEY NOT NULL,
 `attempts` integer NOT NULL,
 `reset_at` text NOT NULL
);
