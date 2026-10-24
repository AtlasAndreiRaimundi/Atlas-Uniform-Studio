CREATE TABLE `order_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`object_key` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_lists_owner_updated_idx` ON `order_lists` (`owner_id`,`updated_at`);