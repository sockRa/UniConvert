import { Worker, Job } from 'bullmq';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { CONFIG } from '../config.js';
import { getRedisOptions } from '../queues/conversionQueue.js';
import { sendWebhook } from '../services/webhookService.js';

interface ImageJobData {
    jobId: string;
    inputPath: string;
    originalName: string;
    targetFormat: string;
    quality: number;
    resize?: {
        width?: number;
        height?: number;
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    };
    webhookUrl?: string;
}

async function processImageJob(job: Job<ImageJobData>) {
    const { jobId, inputPath, originalName, targetFormat, quality, resize, webhookUrl } = job.data;

    const baseName = path.basename(originalName, path.extname(originalName));
    const outputFilename = `${jobId}_${baseName}.${targetFormat}`;
    const outputPath = path.join(CONFIG.outputsDir, outputFilename);

    try {
        await job.updateProgress(10);

        let pipeline = sharp(inputPath);

        // Strip EXIF data for privacy
        pipeline = pipeline.rotate(); // Auto-rotate based on EXIF, then strip

        // Apply resize if specified
        if (resize && (resize.width || resize.height)) {
            pipeline = pipeline.resize({
                width: resize.width,
                height: resize.height,
                fit: resize.fit || 'inside',
                withoutEnlargement: true,
            });
        }

        await job.updateProgress(30);

        // Apply format conversion with quality settings
        switch (targetFormat) {
            case 'jpg':
            case 'jpeg':
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
                break;
            case 'png':
                pipeline = pipeline.png({ compressionLevel: 9 - Math.floor(quality / 12) });
                break;
            case 'webp':
                pipeline = pipeline.webp({ quality });
                break;
            case 'avif':
                pipeline = pipeline.avif({ quality });
                break;
            case 'gif':
                pipeline = pipeline.gif();
                break;
            case 'tiff':
                pipeline = pipeline.tiff({ quality });
                break;
            default:
                pipeline = pipeline.toFormat(targetFormat as keyof sharp.FormatEnum);
        }

        await job.updateProgress(50);

        // Write output
        await pipeline.toFile(outputPath);

        await job.updateProgress(100);

        // Clean up input file
        await fs.unlink(inputPath).catch(() => { });

        const result = {
            download_url: `/downloads/${outputFilename}`,
            filename: outputFilename,
            original_filename: originalName,
        };

        if (webhookUrl) {
            await sendWebhook(webhookUrl, {
                job_id: jobId,
                status: 'completed',
                ...result,
            });
        }

        return result;
    } catch (error) {
        await fs.unlink(inputPath).catch(() => { });
        await fs.unlink(outputPath).catch(() => { });

        if (webhookUrl) {
            await sendWebhook(webhookUrl, {
                job_id: jobId,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        throw error;
    }
}

export const imageWorker = new Worker('image-conversion', processImageJob, {
    connection: getRedisOptions(),
    concurrency: CONFIG.maxConcurrentJobs * 2, // Images are fast, allow more concurrency
});

imageWorker.on('failed', (job, err) => {
    console.error(`Image job ${job?.id} failed:`, err.message);
});
