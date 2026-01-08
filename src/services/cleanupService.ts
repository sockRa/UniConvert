import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG } from '../config.js';

export function startCleanupService() {
    // Run cleanup on startup
    cleanup();

    // Schedule periodic cleanup
    setInterval(cleanup, CONFIG.cleanupIntervalHours * 60 * 60 * 1000);
}

async function cleanup() {
    try {
        const cutoffTime = Date.now() - (CONFIG.fileRetentionHours * 60 * 60 * 1000);

        // Clean uploads directory
        await cleanDirectory(CONFIG.uploadsDir, cutoffTime);

        // Clean outputs directory
        await cleanDirectory(CONFIG.outputsDir, cutoffTime);

        console.log('Cleanup completed');
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

async function cleanDirectory(dir: string, cutoffTime: number) {
    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);

            try {
                const stats = await fs.stat(filePath);

                if (stats.isFile() && stats.mtimeMs < cutoffTime) {
                    await fs.unlink(filePath);
                    console.log(`Deleted old file: ${file}`);
                }
            } catch (err) {
                // File might have been deleted already
            }
        }
    } catch (err) {
        // Directory might not exist yet
        await fs.mkdir(dir, { recursive: true });
    }
}
