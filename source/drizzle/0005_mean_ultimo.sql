CREATE TABLE `production_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`client` text DEFAULT '' NOT NULL,
	`order_number` text DEFAULT '' NOT NULL,
	`object_key` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `production_orders_owner_updated_idx` ON `production_orders` (`owner_id`,`updated_at`);