-- Explicit routing; existing orders are unassigned until an authorized user selects a factory.
ALTER TABLE production_orders ADD COLUMN factory_id TEXT CHECK(factory_id IN ('meinerz','adiprime') OR factory_id IS NULL);
CREATE INDEX IF NOT EXISTS production_orders_factory_state_idx ON production_orders(factory_id,production_state,updated_at);
CREATE TABLE factory_memberships (
 user_id TEXT NOT NULL,
 factory_id TEXT NOT NULL CHECK(factory_id IN ('meinerz','adiprime')),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL,
 UNIQUE (user_id,factory_id)
);
CREATE INDEX factory_memberships_factory_idx ON factory_memberships(factory_id,enabled);
CREATE TABLE factory_download_events (
 id TEXT PRIMARY KEY NOT NULL,
 order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL,
 factory_id TEXT NOT NULL CHECK(factory_id IN ('meinerz','adiprime')),
 kind TEXT NOT NULL CHECK(kind IN ('pdf','package','cdr')),
 revision INTEGER NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX factory_download_events_order_created_idx ON factory_download_events(order_id,created_at);
