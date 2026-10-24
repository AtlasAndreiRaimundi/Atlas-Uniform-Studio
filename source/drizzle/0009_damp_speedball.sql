ALTER TABLE `order_lists` ADD `project_id` text REFERENCES projects(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `order_lists` ADD `order_id` text REFERENCES production_orders(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `order_lists` ADD `reviewed_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `reviewed_version` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `reviewed_at` text DEFAULT '' NOT NULL;