import axios from 'axios';

interface WebhookPayload {
    job_id: string;
    status: 'completed' | 'failed';
    download_url?: string;
    filename?: string;
    original_filename?: string;
    error?: string;
    processing_time_ms?: number;
}

export async function sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
    try {
        await axios.post(url, {
            ...payload,
            timestamp: new Date().toISOString(),
        }, {
            timeout: 10000, // 10 second timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'UniConvert/1.0',
            },
        });
        console.log(`Webhook sent to ${url} for job ${payload.job_id}`);
    } catch (error) {
        // Log but don't throw - webhook failures shouldn't affect job completion
        console.error(`Webhook failed for ${url}:`, error instanceof Error ? error.message : error);
    }
}
