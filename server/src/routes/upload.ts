import { Router } from 'express';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET } from '../lib/r2.js';
import { excelQueue } from '../lib/queue.js';
import { v4 as uuid } from 'uuid';

const router = Router();

/**
 * POST /api/upload/sign
 * Generates a presigned URL for direct R2 upload (Zero-Server-RAM)
 */
router.post('/sign', async (req, res) => {
    try {
        const { filename, contentType } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'filename is required' });
        }

        const fileKey = `uploads/${uuid()}/${filename}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: fileKey,
            ContentType: contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        console.log('[Upload] Generated presigned URL for:', fileKey);

        res.json({ presignedUrl, fileKey });
    } catch (error: any) {
        console.error('[Upload] Error generating presigned URL:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/upload/notify
 * Called after frontend completes R2 upload. Enqueues processing job.
 */
router.post('/notify', async (req, res) => {
    try {
        const { fileKey, userId, spreadsheetId } = req.body;

        if (!fileKey) {
            return res.status(400).json({ error: 'fileKey is required' });
        }

        const job = await excelQueue.add('process-excel', {
            fileKey,
            userId: userId || 'anonymous',
            spreadsheetId: spreadsheetId || uuid(),
        });

        console.log('[Upload] Job enqueued:', job.id, 'for file:', fileKey);

        res.json({
            jobId: job.id,
            status: 'queued',
            message: 'File processing started'
        });
    } catch (error: any) {
        console.error('[Upload] Error enqueueing job:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/upload/status/:jobId
 * Check the status of a processing job
 */
router.get('/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await excelQueue.getJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const state = await job.getState();
        const progress = job.progress;

        res.json({
            jobId,
            state,
            progress,
            data: job.data,
            result: job.returnvalue,
            failedReason: job.failedReason,
        });
    } catch (error: any) {
        console.error('[Upload] Error checking job status:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
