import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processExcel } from './processors/excelProcessor.js';
import { s3Client, R2_BUCKET } from './lib/r2.js';
import type { ProcessingJobData } from '../../shared/types.js';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL!;

const redisConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

console.log('[Worker] Starting AutoGrid Excel Processing Worker...');
console.log('[Worker] Connected to Redis');
console.log('[Worker] Using R2 bucket:', R2_BUCKET);

const worker = new Worker<ProcessingJobData>(
    'excel-processing',
    async (job) => {
        console.log(`[Worker] Processing job ${job.id}:`, job.data);

        const { fileKey, userId, spreadsheetId } = job.data;
        const outputPrefix = `processed/${spreadsheetId}`;

        try {
            // Update job progress
            await job.updateProgress(0);

            const manifest = await processExcel(
                s3Client,
                R2_BUCKET,
                fileKey,
                outputPrefix,
                async (percent, message) => {
                    await job.updateProgress(percent);
                    console.log(`[Worker] Job ${job.id}: ${percent}% - ${message}`);
                }
            );

            console.log(`[Worker] Job ${job.id} completed successfully!`);

            return {
                success: true,
                manifestKey: `${outputPrefix}/manifest.json`,
                totalRows: manifest.totalRows,
                totalChunks: manifest.chunks.length,
                sheets: manifest.sheets.map(s => ({ id: s.id, name: s.name, rowCount: s.rowCount })),
            };
        } catch (error: any) {
            console.error(`[Worker] Job ${job.id} failed:`, error);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 2, // Process 2 files at a time
    }
);

worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed:`, result);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
});

console.log('[Worker] Ready and waiting for jobs...');
