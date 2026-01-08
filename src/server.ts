import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { CONFIG } from './config.js';
import { convertRouter } from './routes/convert.js';
import { jobsRouter } from './routes/jobs.js';
import { healthRouter } from './routes/health.js';
import { setupQueues } from './queues/conversionQueue.js';
import { startWorkers } from './workers/index.js';
import { startCleanupService } from './services/cleanupService.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve output files for download
app.use('/downloads', express.static(CONFIG.outputsDir));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/convert', convertRouter);
app.use('/api/jobs', jobsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: CONFIG.nodeEnv === 'development' ? err.message : undefined,
    });
});

// Start server
async function start() {
    try {
        // Initialize queues
        await setupQueues();
        console.log('✓ BullMQ queues initialized');

        // Start workers
        await startWorkers();
        console.log('✓ Conversion workers started');

        // Start cleanup service
        startCleanupService();
        console.log('✓ Cleanup service started');

        // Start HTTP server
        app.listen(CONFIG.port, () => {
            console.log(`\n🚀 UniConvert server running on http://localhost:${CONFIG.port}`);
            console.log(`   Environment: ${CONFIG.nodeEnv}`);
            console.log(`   Max file size: ${CONFIG.maxFileSize / 1024 / 1024}MB`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
