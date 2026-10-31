ALTER TABLE `sales_quotations` ADD `share_token` text;--> statement-breakpoint
ALTER TABLE `sales_quotations` ADD `share_snapshot_json` text;--> statement-breakpoint
CREATE UNIQUE INDEX `sales_quotations_share_token_idx` ON `sales_quotations` (`share_token`);