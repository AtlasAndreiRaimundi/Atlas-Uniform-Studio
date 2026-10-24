CREATE TABLE `order_reminder_receipts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`seen_on` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `production_orders` ADD `production_state` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `production_orders` ADD `tracking_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX `production_orders_state_idx` ON `production_orders` (`production_state`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `factory_access` integer DEFAULT 0 NOT NULL;