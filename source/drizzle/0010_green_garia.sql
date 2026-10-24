CREATE TABLE `order_technical_files` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `production_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_technical_files_order_owner_idx` ON `order_technical_files` (`order_id`,`owner_id`);