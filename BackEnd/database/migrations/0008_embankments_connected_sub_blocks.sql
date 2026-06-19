-- =============================================================================
-- Migration 0008: Add connected_sub_blocks to embankments
--
-- Changes:
--   1. Add connected_sub_blocks column to mst.embankments
-- =============================================================================

ALTER TABLE mst.embankments
  ADD COLUMN connected_sub_blocks JSONB NOT NULL DEFAULT '[]'::jsonB;

COMMENT ON COLUMN mst.embankments.connected_sub_blocks IS
  'List of IDs (UUIDs) of sub-blocks connected to this embankment.';
