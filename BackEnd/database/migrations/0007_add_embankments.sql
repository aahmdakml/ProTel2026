-- =============================================================================
-- Migration 0007: Add embankments table & unique_code to sub_blocks
--
-- Changes:
--   1. Drop UNIQUE(field_id, code) constraint from mst.sub_blocks
--   2. Add unique_code column to mst.sub_blocks (generated as code || '_' || id)
--   3. Create mst.embankments table (mirrors sub_blocks, no unique code,
--      has unique_code generated column)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Alter mst.sub_blocks: drop old unique constraint, add unique_code
-- ---------------------------------------------------------------------------

-- Drop the composite unique constraint on (field_id, code)
ALTER TABLE mst.sub_blocks
  DROP CONSTRAINT IF EXISTS sub_blocks_field_id_code_key;

-- Add unique_code as a stored generated column: format = {code}_{id}
-- Uses COALESCE so rows with NULL code get 'nocode_{id}'
ALTER TABLE mst.sub_blocks
  ADD COLUMN unique_code TEXT GENERATED ALWAYS AS (
    COALESCE(code, 'nocode') || '_' || id::text
  ) STORED;

-- Add unique index on unique_code
CREATE UNIQUE INDEX idx_sub_blocks_unique_code ON mst.sub_blocks(unique_code);

-- ---------------------------------------------------------------------------
-- 2. Create mst.embankments  ← PEMATANG SAWAH (sub-block border)
-- ---------------------------------------------------------------------------

CREATE TABLE mst.embankments (
  id             UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id       UUID                    NOT NULL REFERENCES mst.fields(id) ON DELETE RESTRICT,
  name           TEXT                    NOT NULL,
  -- code is NOT unique (multiple embankments can share a code across fields)
  code           TEXT,
  polygon_geom   TEXT                    NOT NULL,
  -- unique_code: generated as {code}_{id}, guaranteed unique across the table
  unique_code    TEXT GENERATED ALWAYS AS (
                   COALESCE(code, 'nocode') || '_' || id::text
                 ) STORED,
  area_m2        NUMERIC(12, 2),
  centroid       TEXT,
  elevation_m    NUMERIC(7, 2),
  soil_type      TEXT,
  display_order  INTEGER                 NOT NULL DEFAULT 0,
  is_active      BOOLEAN                 NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ             NOT NULL DEFAULT now()
);

COMMENT ON TABLE mst.embankments IS
  'Pematang sawah (galengan / sub-block border). Polygon geometry stored as GeoJSON text. '
  'unique_code is auto-generated as {code}_{id}.';

CREATE TRIGGER trg_embankments_updated_at
  BEFORE UPDATE ON mst.embankments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_embankments_field_id   ON mst.embankments(field_id);
CREATE UNIQUE INDEX idx_embankments_unique_code ON mst.embankments(unique_code);
