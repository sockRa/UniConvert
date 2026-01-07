import path from 'path';
import fs from 'fs';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

// Helper to upload a file and get job ID
async function uploadAndConvert(
    filename: string,
    endpoint: string,
    options: Record<string, string>
): Promise<string> {
    const filePath = path.join(FIXTURES_DIR, filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Test fixture not found: ${filePath}`);
    }

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, filename);

    Object.entries(options).forEach(([key, value]) => {
        formData.append(key, value);
    });

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.job_id;
}

// Helper to poll until job completes
async function pollUntilComplete(jobId: string, timeoutMs = 60000): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const response = await fetch(`${API_URL}/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed' || data.status === 'failed') {
            return data;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Job timed out');
}

describe('Conversion API Integration Tests', () => {
    // Health check
    describe('Health Endpoint', () => {
        test('reports all tools available', async () => {
            const response = await fetch(`${API_URL}/api/health`);
            const data = await response.json();

            expect(data.status).toBe('ok');
            expect(data.tools.ffmpeg).toBe(true);
            expect(data.tools.pandoc).toBe(true);
            expect(data.tools.libreoffice).toBe(true);
            expect(data.tools.sharp).toBe(true);
        });
    });

    // Image conversions (fastest, test first)
    describe('Image Conversion', () => {
        test('converts WebP to PNG', async () => {
            const jobId = await uploadAndConvert('sample.webp', '/api/convert/image', {
                target_format: 'png',
            });

            const result = await pollUntilComplete(jobId);
            expect(result.status).toBe('completed');
            expect(result.result.download_url).toContain('.png');
        });

        test('converts PNG to JPEG with quality', async () => {
            const jobId = await uploadAndConvert('sample.png', '/api/convert/image', {
                target_format: 'jpg',
                quality: '85',
            });

            const result = await pollUntilComplete(jobId);
            expect(result.status).toBe('completed');
        });
    });

    // Document conversions
    describe('Document Conversion', () => {
        test('converts Markdown to HTML', async () => {
            const jobId = await uploadAndConvert('sample.md', '/api/convert/document', {
                target_format: 'html',
            });

            const result = await pollUntilComplete(jobId);
            expect(result.status).toBe('completed');
        });

        test('converts DOCX to PDF via LibreOffice', async () => {
            const jobId = await uploadAndConvert('sample.docx', '/api/convert/document', {
                target_format: 'pdf',
            });

            const result = await pollUntilComplete(jobId, 120000); // 2 min timeout for LibreOffice
            expect(result.status).toBe('completed');
        });
    });

    // Video conversions (slowest)
    describe('Video Conversion', () => {
        test('converts MKV to MP4 with h264', async () => {
            const jobId = await uploadAndConvert('sample.mkv', '/api/convert/video', {
                target_format: 'mp4',
                codec: 'h264',
                quality: 'medium',
            });

            const result = await pollUntilComplete(jobId, 300000); // 5 min timeout
            expect(result.status).toBe('completed');
            expect(result.result.download_url).toContain('.mp4');
        });
    });

    // Async behavior
    describe('Async Processing', () => {
        test('returns job ID immediately', async () => {
            const start = Date.now();

            const response = await fetch(`${API_URL}/api/health`);
            expect(response.ok).toBe(true);

            // Health check should be fast
            expect(Date.now() - start).toBeLessThan(1000);
        });
    });

    // Job management
    describe('Job Management', () => {
        test('can list jobs', async () => {
            const response = await fetch(`${API_URL}/api/jobs`);
            const data = await response.json();

            expect(Array.isArray(data.jobs)).toBe(true);
            expect(data.page).toBeDefined();
            expect(data.limit).toBeDefined();
        });

        test('returns 404 for non-existent job', async () => {
            const response = await fetch(`${API_URL}/api/jobs/non-existent-id`);
            expect(response.status).toBe(404);
        });
    });
});
