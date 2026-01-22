import { Router } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET } from '../lib/r2.js';
import { Readable } from 'stream';

const router = Router();

/**
 * GET /api/chunks?key=processed/xxx/manifest.json
 * Proxy R2 chunk/manifest files to avoid CORS issues
 * Uses query parameter for Express 5 compatibility
 */
router.get('/', async (req, res) => {
    try {
        const key = req.query.key as string;

        if (!key) {
            return res.status(400).json({ error: 'Key query parameter is required' });
        }

        console.log('[Chunks] Fetching:', key);

        const command = new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        });

        const response = await s3Client.send(command);

        // Set content type
        res.setHeader('Content-Type', response.ContentType || 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Stream the response
        if (response.Body instanceof Readable) {
            response.Body.pipe(res);
        } else {
            // For non-streaming responses
            const chunks: Buffer[] = [];
            for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
                chunks.push(Buffer.from(chunk));
            }
            res.send(Buffer.concat(chunks));
        }
    } catch (error: any) {
        console.error('[Chunks] Error fetching:', error);

        if (error.name === 'NoSuchKey') {
            return res.status(404).json({ error: 'File not found' });
        }

        res.status(500).json({ error: error.message });
    }
});

export default router;
