import { Worker, Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { CONFIG } from '../config.js';
import { getRedisOptions } from '../queues/conversionQueue.js';
import { sendWebhook } from '../services/webhookService.js';
import { AUDIO_CODECS, AUDIO_BITRATES } from '../utils/ffmpegPresets.js';

interface AudioJobData {
    jobId: string;
    inputPath: string;
    originalName: string;
    targetFormat: string;
    bitrate: string;
    webhookUrl?: string;
}

async function processAudioJob(job: Job<AudioJobData>) {
    const { jobId, inputPath, originalName, targetFormat, bitrate, webhookUrl } = job.data;

    const baseName = path.basename(originalName, path.extname(originalName));
    const outputFilename = `${jobId}_${baseName}.${targetFormat}`;
    const outputPath = path.join(CONFIG.outputsDir, outputFilename);

    try {
        await job.updateProgress(0);

        await new Promise<void>((resolve, reject) => {
            let command = ffmpeg(inputPath)
                .output(outputPath)
                .format(targetFormat)
                .noVideo();

            // Apply audio codec
            const audioCodec = AUDIO_CODECS[targetFormat];
            if (audioCodec) {
                command = command.audioCodec(audioCodec);
            }

            // Apply bitrate
            const audioBitrate = AUDIO_BITRATES[bitrate] || bitrate;
            command = command.audioBitrate(audioBitrate);

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

export const audioWorker = new Worker('audio-conversion', processAudioJob, {
    connection: getRedisOptions(),
    concurrency: CONFIG.maxConcurrentJobs,
});

audioWorker.on('failed', (job, err) => {
    console.error(`Audio job ${job?.id} failed:`, err.message);
});
