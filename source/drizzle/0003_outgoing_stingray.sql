CREATE TABLE `project_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_folders_owner_name_idx` ON `project_folders` (`owner_id`,`name_key`);--> statement-breakpoint
ALTER TABLE `projects` ADD `folder_id` text REFERENCES project_folders(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `projects_owner_folder_idx` ON `projects` (`owner_id`,`folder_id`);
