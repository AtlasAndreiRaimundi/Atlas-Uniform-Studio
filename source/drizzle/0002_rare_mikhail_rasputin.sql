CREATE TABLE `client_libraries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`colors_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_owner_idx` ON `client_libraries` (`owner_id`);--> statement-breakpoint
CREATE TABLE `library_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`file_key` text NOT NULL,
	`content_type` text NOT NULL,
	`file_name` text NOT NULL,
	`size` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assets_client_owner_idx` ON `library_assets` (`owner_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `piece_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`version_id` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`anchor_json` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`changed_by` text,
	`changed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comments_proposal_version_idx` ON `piece_comments` (`proposal_id`,`version_id`);--> statement-breakpoint
CREATE TABLE `presentation_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`settings_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `presets_owner_idx` ON `presentation_presets` (`owner_id`);--> statement-breakpoint
CREATE TABLE `proposal_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`version_id` text NOT NULL,
	`author_name` text NOT NULL,
	`statement` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approval_proposal_version_idx` ON `proposal_approvals` (`proposal_id`,`version_id`);--> statement-breakpoint
CREATE TABLE `proposal_options` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`version_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_option_unique_idx` ON `proposal_options` (`proposal_id`,`version_id`);--> statement-breakpoint
CREATE TABLE `proposal_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`project_version` integer NOT NULL,
	`name` text NOT NULL,
	`client_name` text NOT NULL,
	`designer_name` text NOT NULL,
	`template_id` text NOT NULL,
	`template_json` text NOT NULL,
	`visual_json` text NOT NULL,
	`presentation_json` text NOT NULL,
	`map_key` text NOT NULL,
	`map_name` text NOT NULL,
	`thumbnail_key` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `versions_owner_project_idx` ON `proposal_versions` (`owner_id`,`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `versions_project_revision_idx` ON `proposal_versions` (`project_id`,`project_version`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`client_name` text NOT NULL,
	`token` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_token_idx` ON `proposals` (`token`);--> statement-breakpoint
CREATE INDEX `proposals_owner_idx` ON `proposals` (`owner_id`,`updated_at`);--> statement-breakpoint
ALTER TABLE `projects` ADD `presentation_json` text DEFAULT '{}' NOT NULL;