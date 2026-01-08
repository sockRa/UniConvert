import { Worker, Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import path from 'node:path';
import fs from 'node:fs/promises';
import { CONFIG } from '../config.js';
import { getRedisOptions } from '../queues/conversionQueue.js';
import { sendWebhook } from '../services/webhookService.js';
import { VIDEO_PRESETS, QUALITY_PRESETS, RESOLUTION_PRESETS } from '../utils/ffmpegPresets.js';

interface VideoJobData {
    jobId: string;
    inputPath: string;
    originalName: string;
    targetFormat: string;
    codec: string;
    quality: string;
    resolution: string;
    webhookUrl?: string;
}

async function processVideoJob(job: Job<VideoJobData>) {
    const { jobId, inputPath, originalName, targetFormat, codec, quality, resolution, webhookUrl } = job.data;

    const baseName = path.basename(originalName, path.extname(originalName));
    const outputFilename = `${jobId}_${baseName}.${targetFormat}`;
    const outputPath = path.join(CONFIG.outputsDir, outputFilename);

    try {
        await job.updateProgress(0);

        await new Promise<void>((resolve, reject) => {
            let command = ffmpeg(inputPath)
                .output(outputPath)
                .format(targetFormat);

            // Apply codec preset
            const codecPreset = VIDEO_PRESETS[codec] || VIDEO_PRESETS.h264;
            command = command.videoCodec(codecPreset.codec);

            if (codecPreset.preset) {
                command = command.addOutputOption(`-preset ${codecPreset.preset}`);
            }

            // Apply quality preset
            const qualityPreset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;
            command = command.addOutputOption(`-crf ${qualityPreset.crf}`);

            // Apply resolution
            if (resolution !== 'original') {
                const resPreset = RESOLUTION_PRESETS[resolution];
                if (resPreset) {
                    command = command.size(`${resPreset.width}x?`);
                }
            }

            command
                .on('progress', (progress) => {
                    if (progress.percent) {
                        job.updateProgress(Math.round(progress.percent));
                    }
                })
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        await job.updateProgress(100);

        // Clean up input file
        await fs.unlink(inputPath).catch(() => { });

        const result = {
            download_url: `/downloads/${outputFilename}`,
            filename: outputFilename,
            original_filename: originalName,
        };

        // Send webhook if configured
        if (webhookUrl) {
            await sendWebhook(webhookUrl, {
                job_id: jobId,
                status: 'completed',
                ...result,
            });
        }

        return result;
    } catch (error) {
        // Clean up on failure
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

export const videoWorker = new Worker('video-conversion', processVideoJob, {
    connection: getRedisOptions(),
    concurrency: CONFIG.maxConcurrentJobs,
});

videoWorker.on('failed', (job, err) => {
    console.error(`Video job ${job?.id} failed:`, err.message);
});
