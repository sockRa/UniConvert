import { Router } from 'express';
import {
    videoQueue,
    audioQueue,
    imageQueue,
    documentQueue,
    getJobFromAnyQueue
} from '../queues/conversionQueue.js';

export const jobsRouter = Router();

// Get job status
jobsRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const job = await getJobFromAnyQueue(id);

        if (!job) {
            return res.status(404).json({
                error: 'Job not found',
                job_id: id
            });
        }

        const state = await job.getState();
        const progress = job.progress;

        const response: Record<string, unknown> = {
            id: job.id,
            status: mapState(state),
            progress: typeof progress === 'number' ? progress : 0,
            created_at: new Date(job.timestamp).toISOString(),
        };

        if (state === 'completed' && job.returnvalue) {
            response.result = job.returnvalue;
        }

        if (state === 'failed' && job.failedReason) {
            response.error = job.failedReason;
        }

        res.json(response);
    } catch (error) {
        console.error('Get job status error:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
});

// Cancel/delete a job
jobsRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const job = await getJobFromAnyQueue(id);

        if (!job) {
            return res.status(404).json({
                error: 'Job not found',
                job_id: id
            });
        }

        const state = await job.getState();

        if (state === 'active') {
            // Try to abort active job
            await job.moveToFailed(new Error('Job cancelled by user'), 'cancelled');
        } else if (state === 'waiting' || state === 'delayed') {
            await job.remove();
        }

        res.json({
            success: true,
            message: 'Job cancelled',
            job_id: id
        });
    } catch (error) {
        console.error('Cancel job error:', error);
        res.status(500).json({ error: 'Failed to cancel job' });
    }
});

// List all jobs (with pagination)
jobsRouter.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string;

        const start = (page - 1) * limit;
        const end = start + limit;

        // Get jobs from all queues
        const allJobs = await Promise.all([
            getJobsWithType(videoQueue, 'video', status),
            getJobsWithType(audioQueue, 'audio', status),
            getJobsWithType(imageQueue, 'image', status),
            getJobsWithType(documentQueue, 'document', status),
        ]);

        const jobs = allJobs
            .flat()
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(start, end);

        res.json({
            jobs: jobs.map(formatJob),
            page,
            limit,
            total: allJobs.flat().length,
        });
    } catch (error) {
        console.error('List jobs error:', error);
        res.status(500).json({ error: 'Failed to list jobs' });
    }
});

async function getJobsWithType(queue: any, type: string, status?: string) {
    const states = status
        ? [mapStatusToState(status)]
        : ['active', 'waiting', 'completed', 'failed', 'delayed'];

    const jobs = await queue.getJobs(states);
    return jobs.map((job: any) => ({ ...job, type }));
}

function mapState(state: string): string {
    const stateMap: Record<string, string> = {
        'waiting': 'queued',
        'active': 'processing',
        'completed': 'completed',
        'failed': 'failed',
        'delayed': 'queued',
    };
    return stateMap[state] || state;
}

function mapStatusToState(status: string): string {
    const statusMap: Record<string, string> = {
        'queued': 'waiting',
        'processing': 'active',
        'completed': 'completed',
        'failed': 'failed',
    };
    return statusMap[status] || status;
}

function formatJob(job: any) {
    return {
        id: job.id,
        type: job.type,
        status: mapState(job.state || 'unknown'),
        original_filename: job.data?.originalName,
        target_format: job.data?.targetFormat,
        created_at: new Date(job.timestamp).toISOString(),
    };
}
