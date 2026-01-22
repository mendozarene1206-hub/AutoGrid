/**
 * workflow.routes.ts
 * 
 * Express routes for document workflow management.
 * Handles state transitions with validation.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import stringify from 'json-stable-stringify';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
);

// Helper to calculate hash
function calculateHash(data: any): string {
    return crypto.createHash('sha256').update(stringify(data) || '').digest('hex');
}

/**
 * POST /workflow/submit-review
 * Transition: DRAFT -> IN_REVIEW
 * Requires: spreadsheet_id, snapshot_hash
 */
router.post('/submit-review', async (req, res) => {
    try {
        const { spreadsheet_id, snapshot_hash, user_id } = req.body;

        if (!spreadsheet_id || !snapshot_hash) {
            return res.status(400).json({ error: 'Missing spreadsheet_id or snapshot_hash' });
        }

        // 1. Verify current status is draft or changes_requested
        const { data: spreadsheet, error: fetchError } = await supabase
            .from('spreadsheets')
            .select('status, raw_data, storage_path')
            .eq('id', spreadsheet_id)
            .single();

        if (fetchError || !spreadsheet) {
            return res.status(404).json({ error: 'Spreadsheet not found' });
        }

        if (spreadsheet.status !== 'draft' && spreadsheet.status !== 'changes_requested') {
            return res.status(400).json({
                error: `Cannot submit for review: current status is '${spreadsheet.status}'`
            });
        }

        // 2. Update status
        const { error: updateError } = await supabase
            .from('spreadsheets')
            .update({
                status: 'in_review',
                updated_at: new Date().toISOString()
            })
            .eq('id', spreadsheet_id);

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        // 3. Create signature record
        if (user_id) {
            await supabase.from('signatures').insert({
                spreadsheet_id,
                signer_id: user_id,
                snapshot_hash,
                role: 'Resident'
            });
        }

        console.log(`[Workflow] Spreadsheet ${spreadsheet_id} submitted for review`);
        res.json({ success: true, new_status: 'in_review', hash: snapshot_hash });

    } catch (error: any) {
        console.error('[Workflow] Submit review error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /workflow/approve
 * Transition: IN_REVIEW -> APPROVED_INTERNAL
 * Requires: spreadsheet_id, user_id (reviewer)
 */
router.post('/approve', async (req, res) => {
    try {
        const { spreadsheet_id, user_id } = req.body;

        if (!spreadsheet_id) {
            return res.status(400).json({ error: 'Missing spreadsheet_id' });
        }

        // 1. Verify current status is in_review
        const { data: spreadsheet, error: fetchError } = await supabase
            .from('spreadsheets')
            .select('status, raw_data')
            .eq('id', spreadsheet_id)
            .single();

        if (fetchError || !spreadsheet) {
            return res.status(404).json({ error: 'Spreadsheet not found' });
        }

        if (spreadsheet.status !== 'in_review') {
            return res.status(400).json({
                error: `Cannot approve: current status is '${spreadsheet.status}'`
            });
        }

        // 2. Calculate final hash
        const finalHash = calculateHash(spreadsheet.raw_data);

        // 3. Update status
        const { error: updateError } = await supabase
            .from('spreadsheets')
            .update({
                status: 'approved_internal',
                updated_at: new Date().toISOString()
            })
            .eq('id', spreadsheet_id);

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        // 4. Create approval signature
        if (user_id) {
            await supabase.from('signatures').insert({
                spreadsheet_id,
                signer_id: user_id,
                snapshot_hash: finalHash,
                role: 'Manager'
            });
        }

        console.log(`[Workflow] Spreadsheet ${spreadsheet_id} approved`);
        res.json({ success: true, new_status: 'approved_internal', hash: finalHash });

    } catch (error: any) {
        console.error('[Workflow] Approve error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /workflow/reject
 * Transition: IN_REVIEW -> CHANGES_REQUESTED
 * Requires: spreadsheet_id
 */
router.post('/reject', async (req, res) => {
    try {
        const { spreadsheet_id, reason } = req.body;

        if (!spreadsheet_id) {
            return res.status(400).json({ error: 'Missing spreadsheet_id' });
        }

        // 1. Verify current status is in_review
        const { data: spreadsheet, error: fetchError } = await supabase
            .from('spreadsheets')
            .select('status')
            .eq('id', spreadsheet_id)
            .single();

        if (fetchError || !spreadsheet) {
            return res.status(404).json({ error: 'Spreadsheet not found' });
        }

        if (spreadsheet.status !== 'in_review') {
            return res.status(400).json({
                error: `Cannot reject: current status is '${spreadsheet.status}'`
            });
        }

        // 2. Update status
        const { error: updateError } = await supabase
            .from('spreadsheets')
            .update({
                status: 'changes_requested',
                updated_at: new Date().toISOString()
            })
            .eq('id', spreadsheet_id);

        if (updateError) {
            return res.status(500).json({ error: updateError.message });
        }

        console.log(`[Workflow] Spreadsheet ${spreadsheet_id} rejected: ${reason || 'No reason provided'}`);
        res.json({ success: true, new_status: 'changes_requested', reason });

    } catch (error: any) {
        console.error('[Workflow] Reject error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /workflow/status/:spreadsheet_id
 * Get current workflow status and signature history
 */
router.get('/status/:spreadsheet_id', async (req, res) => {
    try {
        const { spreadsheet_id } = req.params;

        // Get spreadsheet status
        const { data: spreadsheet, error: ssError } = await supabase
            .from('spreadsheets')
            .select('status, updated_at')
            .eq('id', spreadsheet_id)
            .single();

        if (ssError || !spreadsheet) {
            return res.status(404).json({ error: 'Spreadsheet not found' });
        }

        // Get signature history
        const { data: signatures, error: sigError } = await supabase
            .from('signatures')
            .select('snapshot_hash, role, signed_at')
            .eq('spreadsheet_id', spreadsheet_id)
            .order('signed_at', { ascending: false });

        res.json({
            status: spreadsheet.status,
            updated_at: spreadsheet.updated_at,
            signatures: signatures || []
        });

    } catch (error: any) {
        console.error('[Workflow] Status error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
