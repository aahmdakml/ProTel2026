ALTER TABLE mst.irrigation_points ADD COLUMN name text;
ALTER TABLE mst.irrigation_points ADD COLUMN assigned_sub_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;
