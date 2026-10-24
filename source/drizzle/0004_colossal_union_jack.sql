ALTER TABLE `client_libraries` ADD `folder_id` text REFERENCES project_folders(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `client_libraries` ADD `migrated_at` text;--> statement-breakpoint
ALTER TABLE `library_assets` ADD `folder_id` text REFERENCES project_folders(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `assets_folder_owner_idx` ON `library_assets` (`owner_id`,`folder_id`);--> statement-breakpoint
ALTER TABLE `project_folders` ADD `colors_json` text DEFAULT '[]' NOT NULL;
