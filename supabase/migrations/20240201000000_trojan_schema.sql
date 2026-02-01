-- ============================================================================
-- AutoGrid Trojan Architecture Schema
-- ============================================================================
-- Migration: 20240201000000
-- Description: Add tables for Trojan data/asset separation
-- ============================================================================

-- ============================================================================
-- ESTIMATION SHEETS (Main data from "Desglose" sheet)
-- ============================================================================

CREATE TABLE estimation_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    
    -- Sheet metadata
    sheet_name TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    column_count INTEGER NOT NULL DEFAULT 0,
    headers JSONB NOT NULL DEFAULT '[]',
    
    -- Data storage (JSON array of rows)
    data JSONB NOT NULL DEFAULT '[]',
    
    -- R2 references
    data_r2_key TEXT NOT NULL,
    manifest_r2_key TEXT NOT NULL,
    
    -- Processing metadata
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processing_time_ms INTEGER,
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for estimation_sheets
CREATE INDEX idx_estimation_sheets_spreadsheet_id ON estimation_sheets(spreadsheet_id);
CREATE INDEX idx_estimation_sheets_sheet_name ON estimation_sheets(sheet_name);

-- Trigger for updated_at
CREATE TRIGGER update_estimation_sheets_updated_at
    BEFORE UPDATE ON estimation_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ESTIMATION ASSETS (Images extracted from other sheets)
-- ============================================================================

CREATE TABLE estimation_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    estimation_sheet_id UUID REFERENCES estimation_sheets(id) ON DELETE SET NULL,
    
    -- Asset identification
    asset_id TEXT NOT NULL UNIQUE, -- e.g., "img-5.2.1-a1b2c3d4"
    concept_code TEXT NOT NULL, -- e.g., "5.2.1"
    
    -- Source location
    original_sheet_name TEXT NOT NULL,
    original_cell_ref TEXT NOT NULL, -- e.g., "B5"
    
    -- File metadata
    filename TEXT NOT NULL,
    file_format TEXT NOT NULL DEFAULT 'webp',
    file_size_bytes INTEGER NOT NULL,
    width_pixels INTEGER,
    height_pixels INTEGER,
    
    -- R2 storage
    r2_key TEXT NOT NULL,
    r2_url TEXT NOT NULL,
    r2_bucket TEXT NOT NULL,
    
    -- Processing metadata
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processing_metadata JSONB DEFAULT '{}',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'error')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for estimation_assets
CREATE INDEX idx_estimation_assets_spreadsheet_id ON estimation_assets(spreadsheet_id);
CREATE INDEX idx_estimation_assets_concept_code ON estimation_assets(concept_code);
CREATE INDEX idx_estimation_assets_sheet_id ON estimation_assets(estimation_sheet_id);
CREATE INDEX idx_estimation_assets_status ON estimation_assets(status);

-- Trigger for updated_at
CREATE TRIGGER update_estimation_assets_updated_at
    BEFORE UPDATE ON estimation_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONCEPT ASSET MAPPING (Many-to-many relationship)
-- ============================================================================

CREATE TABLE concept_asset_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    concept_code TEXT NOT NULL,
    asset_id UUID NOT NULL REFERENCES estimation_assets(id) ON DELETE CASCADE,
    
    -- Ordering for display
    display_order INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint: one asset per concept per spreadsheet
    UNIQUE(spreadsheet_id, concept_code, asset_id)
);

-- Indexes for concept_asset_mappings
CREATE INDEX idx_concept_asset_mappings_spreadsheet_id ON concept_asset_mappings(spreadsheet_id);
CREATE INDEX idx_concept_asset_mappings_concept_code ON concept_asset_mappings(concept_code);
CREATE INDEX idx_concept_asset_mappings_asset_id ON concept_asset_mappings(asset_id);

-- ============================================================================
-- TROJAN PROCESSING LOGS (For debugging and monitoring)
-- ============================================================================

CREATE TABLE trojan_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
    job_id TEXT,
    
    -- Processing stats
    total_sheets INTEGER,
    main_sheet_rows INTEGER,
    images_found INTEGER,
    images_processed INTEGER,
    images_failed INTEGER,
    processing_time_ms INTEGER,
    
    -- Error details (if any)
    error_message TEXT,
    error_stack TEXT,
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for trojan_processing_logs
CREATE INDEX idx_trojan_logs_spreadsheet_id ON trojan_processing_logs(spreadsheet_id);
CREATE INDEX idx_trojan_logs_status ON trojan_processing_logs(status);
CREATE INDEX idx_trojan_logs_created_at ON trojan_processing_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE estimation_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_asset_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trojan_processing_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see sheets from their spreadsheets
CREATE POLICY estimation_sheets_isolation ON estimation_sheets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM spreadsheets s
            WHERE s.id = estimation_sheets.spreadsheet_id
            AND s.user_id = auth.uid()
        )
    );

-- Policy: Users can only see assets from their spreadsheets
CREATE POLICY estimation_assets_isolation ON estimation_assets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM spreadsheets s
            WHERE s.id = estimation_assets.spreadsheet_id
            AND s.user_id = auth.uid()
        )
    );

-- Policy: Users can only see mappings from their spreadsheets
CREATE POLICY concept_asset_mappings_isolation ON concept_asset_mappings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM spreadsheets s
            WHERE s.id = concept_asset_mappings.spreadsheet_id
            AND s.user_id = auth.uid()
        )
    );

-- Policy: Users can only see logs from their spreadsheets
CREATE POLICY trojan_logs_isolation ON trojan_processing_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM spreadsheets s
            WHERE s.id = trojan_processing_logs.spreadsheet_id
            AND s.user_id = auth.uid()
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get assets by concept code
CREATE OR REPLACE FUNCTION get_concept_assets(
    p_spreadsheet_id UUID,
    p_concept_code TEXT
)
RETURNS TABLE (
    asset_id UUID,
    concept_code TEXT,
    filename TEXT,
    r2_url TEXT,
    width_pixels INTEGER,
    height_pixels INTEGER,
    file_size_bytes INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        a.id,
        a.concept_code,
        a.filename,
        a.r2_url,
        a.width_pixels,
        a.height_pixels,
        a.file_size_bytes
    FROM estimation_assets a
    WHERE a.spreadsheet_id = p_spreadsheet_id
    AND a.concept_code = p_concept_code
    AND a.status = 'active'
    ORDER BY a.extracted_at ASC;
$$;

-- Function to get concept summary with asset count
CREATE OR REPLACE FUNCTION get_concept_summary(
    p_spreadsheet_id UUID
)
RETURNS TABLE (
    concept_code TEXT,
    asset_count BIGINT,
    total_size_bytes BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        a.concept_code,
        COUNT(*)::BIGINT as asset_count,
        COALESCE(SUM(a.file_size_bytes), 0)::BIGINT as total_size_bytes
    FROM estimation_assets a
    WHERE a.spreadsheet_id = p_spreadsheet_id
    AND a.status = 'active'
    GROUP BY a.concept_code
    ORDER BY a.concept_code;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE estimation_sheets IS 'Stores the main "Desglose" sheet data as JSON';
COMMENT ON TABLE estimation_assets IS 'Stores image assets extracted from secondary sheets';
COMMENT ON TABLE concept_asset_mappings IS 'Maps concept codes to their associated assets';
COMMENT ON TABLE trojan_processing_logs IS 'Processing logs for debugging and monitoring';
