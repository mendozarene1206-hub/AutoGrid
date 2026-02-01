import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processTrojanExcel } from './processors/TrojanProcessor.js';
import { s3Client, R2_BUCKET } from './lib/r2.js';
import type { TrojanJobData } from './types/trojan.types.js';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL!;

const redisConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

console.log('[Worker] Starting AutoGrid Trojan Processing Worker...');
console.log('[Worker] Connected to Redis');
console.log('[Worker] Using R2 bucket:', R2_BUCKET);
console.log('[Worker] Mode: TROJAN (Data + Assets separation)');

const worker = new Worker<TrojanJobData>(
    'excel-processing',
    async (job) => {
        console.log(`[Worker] Processing Trojan job ${job.id}:`, job.data);

        const { fileKey, userId, spreadsheetId, estimationId } = job.data;
        const outputPrefix = `processed/${spreadsheetId}`;

        try {
            // Update job progress
            await job.updateProgress(0);

            const manifest = await processTrojanExcel(
                s3Client,
                R2_BUCKET,
                fileKey,
                outputPrefix,
                {
                    fileKey,
                    userId,
                    spreadsheetId,
                    estimationId,
                },
                async (percent, message) => {
                    await job.updateProgress(percent);
                    console.log(`[Worker] Job ${job.id}: ${percent}% - ${message}`);
                }
            );

            console.log(`[Worker] Job ${job.id} completed successfully!`);
            console.log(`[Worker] - Main sheet: ${manifest.mainSheet.name} (${manifest.mainSheet.rowCount} rows)`);
            console.log(`[Worker] - Assets extracted: ${manifest.stats.imagesProcessed} images`);
            console.log(`[Worker] - Processing time: ${(manifest.stats.totalProcessingTimeMs / 1000).toFixed(2)}s`);

            return {
                success: true,
                manifestKey: `${outputPrefix}/trojan-manifest.json`,
                mainDataKey: `${outputPrefix}/main-data.json`,
                mainSheet: {
                    name: manifest.mainSheet.name,
                    rowCount: manifest.mainSheet.rowCount,
                    columnCount: manifest.mainSheet.columnCount,
                },
                assets: {
                    total: manifest.assets.length,
                    byConcept: Object.keys(manifest.conceptAssetMap).length,
                },
                stats: manifest.stats,
            };
        } catch (error: any) {
            console.error(`[Worker] Job ${job.id} failed:`, error);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 1, // Trojan mode processes one file at a time due to memory requirements
    }
);

worker.on('completed', (job, result) => {
    console.log(`[Worker] ✅ Job ${job.id} completed:`, JSON.stringify(result, null, 2));
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
});

console.log('[Worker] Ready and waiting for Trojan jobs...');
