CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`model_key` text NOT NULL,
	`source_key` text NOT NULL,
	`svg_key` text NOT NULL,
	`proof_key` text NOT NULL,
	`layout_json` text NOT NULL,
	`source_name` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `templates_status_created_idx` ON `templates` (`status`,`created_at`);