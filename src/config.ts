export const CONFIG = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Redis configuration
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    // File handling
    maxFileSize: parseSize(process.env.MAX_FILE_SIZE || '500MB'),
    uploadsDir: process.env.UPLOADS_DIR || './uploads',
    outputsDir: process.env.OUTPUTS_DIR || './outputs',

    // Cleanup settings
    cleanupIntervalHours: parseInt(process.env.CLEANUP_INTERVAL_HOURS || '24', 10),
    fileRetentionHours: parseInt(process.env.FILE_RETENTION_HOURS || '168', 10), // 7 days

    // Job settings
    jobTimeout: parseInt(process.env.JOB_TIMEOUT_MS || '3600000', 10), // 1 hour default
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),
} as const;

function parseSize(size: string): number {
    const units: Record<string, number> = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
    };

    const match = size.match(/^(\d+)(B|KB|MB|GB)$/i);
    if (!match) return 500 * 1024 * 1024; // Default 500MB

    const value = parseInt(match[1], 10);
    const unit = match[2].toUpperCase();
    return value * (units[unit] || 1);
}
