import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const productionOrderSequences=sqliteTable('production_order_sequences',{
  unit:text('unit').primaryKey(),
  lastValue:integer('last_value').notNull(),
});

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  detailsJson: text('details_json').notNull().default('{}'),
  photoKey: text('photo_key'),
  factoryAccess: integer('factory_access').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const projectFolders = sqliteTable('project_folders', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  nameKey: text('name_key').notNull(),
  colorsJson: text('colors_json').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [uniqueIndex('project_folders_owner_name_idx').on(table.ownerId, table.nameKey)]);

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  clientName: text('client_name').notNull().default(''),
  folderId: text('folder_id').references(() => projectFolders.id, { onDelete: 'set null' }),
  templateId: text('template_id').notNull().default('camiseta-teste-clo-v1'),
  visualJson: text('visual_json').notNull(),
  presentationJson: text('presentation_json').notNull().default('{}'),
  mapKey: text('map_key'),
  mapName: text('map_name'),
  thumbnailKey: text('thumbnail_key'),
  shareToken: text('share_token'),
  version: integer('version').notNull().default(1),
  reviewedVersion: integer('reviewed_version'),
  reviewedAt: text('reviewed_at').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('projects_owner_updated_idx').on(table.ownerId, table.updatedAt), index('projects_owner_folder_idx').on(table.ownerId, table.folderId), uniqueIndex('projects_share_token_idx').on(table.shareToken)]);

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull().default('draft'),
  modelKey: text('model_key').notNull(),
  sourceKey: text('source_key').notNull(),
  svgKey: text('svg_key').notNull(),
  proofKey: text('proof_key').notNull(),
  layoutJson: text('layout_json').notNull(),
  sourceName: text('source_name').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [index('templates_status_created_idx').on(table.status, table.createdAt)]);

export const presentationPresets = sqliteTable('presentation_presets', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), name:text('name').notNull(),
  settingsJson:text('settings_json').notNull(), createdAt:text('created_at').notNull(),
}, t=>[index('presets_owner_idx').on(t.ownerId)]);
export const clientLibraries = sqliteTable('client_libraries', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), name:text('name').notNull(),
  folderId:text('folder_id').references(()=>projectFolders.id,{onDelete:'set null'}), migratedAt:text('migrated_at'),
  colorsJson:text('colors_json').notNull().default('[]'), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
}, t=>[index('clients_owner_idx').on(t.ownerId)]);
export const libraryAssets = sqliteTable('library_assets', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), clientId:text('client_id').notNull(),
  folderId:text('folder_id').references(()=>projectFolders.id,{onDelete:'set null'}),
  name:text('name').notNull(), kind:text('kind').notNull(), fileKey:text('file_key').notNull(),
  contentType:text('content_type').notNull(), fileName:text('file_name').notNull(), size:integer('size').notNull(),
  deleted:integer('deleted').notNull().default(0), createdAt:text('created_at').notNull(),
}, t=>[index('assets_client_owner_idx').on(t.ownerId,t.clientId),index('assets_folder_owner_idx').on(t.ownerId,t.folderId)]);
export const proposalVersions = sqliteTable('proposal_versions', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), projectId:text('project_id').notNull(),
  projectVersion:integer('project_version').notNull(), name:text('name').notNull(), clientName:text('client_name').notNull(),
  designerName:text('designer_name').notNull(), templateId:text('template_id').notNull(),
  templateJson:text('template_json').notNull(), visualJson:text('visual_json').notNull(), presentationJson:text('presentation_json').notNull(),
  mapKey:text('map_key').notNull(), mapName:text('map_name').notNull(), thumbnailKey:text('thumbnail_key'), createdAt:text('created_at').notNull(),
}, t=>[index('versions_owner_project_idx').on(t.ownerId,t.projectId),uniqueIndex('versions_project_revision_idx').on(t.projectId,t.projectVersion)]);
export const proposals = sqliteTable('proposals', {
  id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), name:text('name').notNull(), clientName:text('client_name').notNull(),
  token:text('token').notNull(), enabled:integer('enabled').notNull().default(1), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
}, t=>[uniqueIndex('proposal_token_idx').on(t.token),index('proposals_owner_idx').on(t.ownerId,t.updatedAt)]);
export const proposalOptions = sqliteTable('proposal_options', {
  id:text('id').primaryKey(), proposalId:text('proposal_id').notNull(), versionId:text('version_id').notNull(), createdAt:text('created_at').notNull(),
}, t=>[uniqueIndex('proposal_option_unique_idx').on(t.proposalId,t.versionId)]);
export const pieceComments = sqliteTable('piece_comments', {
  id:text('id').primaryKey(), proposalId:text('proposal_id').notNull(), versionId:text('version_id').notNull(),
  authorName:text('author_name').notNull(), body:text('body').notNull(), anchorJson:text('anchor_json').notNull(),
  status:text('status').notNull().default('open'), changedBy:text('changed_by'), changedAt:text('changed_at'), createdAt:text('created_at').notNull(),
}, t=>[index('comments_proposal_version_idx').on(t.proposalId,t.versionId)]);
export const proposalApprovals = sqliteTable('proposal_approvals', {
  id:text('id').primaryKey(), proposalId:text('proposal_id').notNull(), versionId:text('version_id').notNull(),
  authorName:text('author_name').notNull(), statement:text('statement').notNull(), createdAt:text('created_at').notNull(),
}, t=>[uniqueIndex('approval_proposal_version_idx').on(t.proposalId,t.versionId)]);

export const productionOrders = sqliteTable('production_orders', {
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),
  client:text('client').notNull().default(''),orderNumber:text('order_number').notNull().default(''),
  objectKey:text('object_key').notNull(),version:integer('version').notNull().default(1),
  productionState:text('production_state').notNull().default(''),
  trackingJson:text('tracking_json').notNull().default('{}'),
  createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('production_orders_state_idx').on(t.productionState),index('production_orders_owner_updated_idx').on(t.ownerId,t.updatedAt)]);

export const orderLists = sqliteTable('order_lists', {
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),
  rowCount:integer('row_count').notNull().default(0),objectKey:text('object_key').notNull(),
  projectId:text('project_id').references(()=>projects.id,{onDelete:'set null'}),
  orderId:text('order_id').references(()=>productionOrders.id,{onDelete:'set null'}),
  reviewedAt:text('reviewed_at').notNull().default(''),deletedAt:text('deleted_at'),
  version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('order_lists_owner_updated_idx').on(t.ownerId,t.updatedAt)]);

export const orderReminderReceipts=sqliteTable('order_reminder_receipts',{userId:text('user_id').primaryKey(),seenOn:text('seen_on').notNull()});

export const uniformDesigns=sqliteTable('uniform_designs',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),title:text('title').notNull(),modelId:text('model_id').notNull(),product:text('product').notNull(),objectKey:text('object_key').notNull(),
 version:integer('version').notNull().default(1),orderId:text('order_id'),orderVersion:integer('order_version'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('uniform_designs_owner_updated_idx').on(t.ownerId,t.updatedAt)]);

export const orderTechnicalFiles=sqliteTable('order_technical_files',{
  id:text('id').primaryKey(),orderId:text('order_id').notNull().references(()=>productionOrders.id,{onDelete:'cascade'}),
  ownerId:text('owner_id').notNull(),objectKey:text('object_key').notNull(),fileName:text('file_name').notNull(),
  size:integer('size').notNull(),sha256:text('sha256').notNull(),label:text('label').notNull().default(''),createdAt:text('created_at').notNull(),
},t=>[index('order_technical_files_order_owner_idx').on(t.orderId,t.ownerId)]);

export const salesQuotations=sqliteTable('sales_quotations',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),documentJson:text('document_json').notNull(),
 version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('sales_quotations_owner_updated_idx').on(t.ownerId,t.updatedAt)]);
