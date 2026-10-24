CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`client_name` text DEFAULT '' NOT NULL,
	`template_id` text DEFAULT 'camiseta-teste-clo-v1' NOT NULL,
	`visual_json` text NOT NULL,
	`map_key` text,
	`map_name` text,
	`thumbnail_key` text,
	`share_token` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner_updated_idx` ON `projects` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_share_token_idx` ON `projects` (`share_token`);