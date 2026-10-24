CREATE TABLE `uniform_designs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`model_id` text NOT NULL,
	`product` text NOT NULL,
	`object_key` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`order_id` text,
	`order_version` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `uniform_designs_owner_updated_idx` ON `uniform_designs` (`owner_id`,`updated_at`);