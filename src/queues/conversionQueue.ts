import { Queue, Job } from 'bullmq';
import { CONFIG } from '../config.js';

export let videoQueue: Queue;
export let audioQueue: Queue;
export let imageQueue: Queue;
export let documentQueue: Queue;

function getRedisConfig() {
    const url = new URL(CONFIG.redis.url);
    return {
        host: url.hostname || 'localhost',
        port: parseInt(url.port || '6379', 10),
        maxRetriesPerRequest: null,
    };
}

export async function setupQueues() {
    const connection = getRedisConfig();

    const defaultJobOptions = {
        attempts: 3,
        backoff: {
            type: 'exponential' as const,
            delay: 1000,
        },
        removeOnComplete: {
            age: 7 * 24 * 3600, // Keep completed jobs for 7 days
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    };

    videoQueue = new Queue('video-conversion', {
        connection,
        defaultJobOptions,
    });

    audioQueue = new Queue('audio-conversion', {
        connection,
        defaultJobOptions,
    });

    imageQueue = new Queue('image-conversion', {
        connection,
        defaultJobOptions,
    });

    documentQueue = new Queue('document-conversion', {
        connection,
        defaultJobOptions,
    });

    console.log('  - Video queue ready');
    console.log('  - Audio queue ready');
    console.log('  - Image queue ready');
    console.log('  - Document queue ready');
}

export async function getJobFromAnyQueue(jobId: string): Promise<Job | null> {
    const queues = [videoQueue, audioQueue, imageQueue, documentQueue];

    for (const queue of queues) {
        const job = await queue.getJob(jobId);
        if (job) return job;
    }

    return null;
}

export function getRedisOptions() {
    return getRedisConfig();
}
