import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRouter from './routes/upload.js';
import chunksRouter from './routes/chunks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/chunks', chunksRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`[Server] AutoGrid API running on http://localhost:${PORT}`);
    console.log(`[Server] Endpoints:`);
    console.log(`  POST /api/upload/sign - Get presigned URL for R2 upload`);
    console.log(`  POST /api/upload/notify - Notify server of completed upload`);
    console.log(`  GET  /api/upload/status/:jobId - Check job status`);
    console.log(`  GET  /api/chunks/* - Proxy R2 chunks/manifest`);
});
