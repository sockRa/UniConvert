import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { validateFile } from '../utils/integrityValidators';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

// Helper to check if fixture exists
function fixtureExists(filename: string): boolean {
    return fs.existsSync(path.join(FIXTURES_DIR, filename));
}

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
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${text}`);
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

// Helper to download and validate converted file
async function downloadAndValidate(downloadUrl: string): Promise<{ valid: boolean; error?: string; metadata?: any }> {
    const response = await fetch(`${API_URL}${downloadUrl}`);

    if (!response.ok) {
        return { valid: false, error: `Download failed: ${response.status}` };
    }

    const buffer = await response.arrayBuffer();
    const tempPath = path.join(os.tmpdir(), `uniconvert-test-${Date.now()}${path.extname(downloadUrl)}`);

    fs.writeFileSync(tempPath, Buffer.from(buffer));

    try {
        const result = await validateFile(tempPath);
        return result;
    } finally {
        fs.unlinkSync(tempPath);
    }
}

// Conversion test case definition
interface ConversionTest {
    name: string;
    inputFile: string;
    endpoint: string;
    targetFormat: string;
    options?: Record<string, string>;
    timeout?: number;
}

// ============================================================================
// IMAGE CONVERSION TESTS
// ============================================================================
const imageConversions: ConversionTest[] = [
    // PNG input
    { name: 'PNG → JPEG', inputFile: 'sample.png', endpoint: '/api/convert/image', targetFormat: 'jpg' },
    { name: 'PNG → WebP', inputFile: 'sample.png', endpoint: '/api/convert/image', targetFormat: 'webp' },
    { name: 'PNG → AVIF', inputFile: 'sample.png', endpoint: '/api/convert/image', targetFormat: 'avif' },
    { name: 'PNG → GIF', inputFile: 'sample.png', endpoint: '/api/convert/image', targetFormat: 'gif' },
    { name: 'PNG → TIFF', inputFile: 'sample.png', endpoint: '/api/convert/image', targetFormat: 'tiff' },

    // JPEG input
    { name: 'JPEG → PNG', inputFile: 'sample.jpg', endpoint: '/api/convert/image', targetFormat: 'png' },
    { name: 'JPEG → WebP', inputFile: 'sample.jpg', endpoint: '/api/convert/image', targetFormat: 'webp' },

    // WebP input
    { name: 'WebP → PNG', inputFile: 'sample.webp', endpoint: '/api/convert/image', targetFormat: 'png' },
    { name: 'WebP → JPEG', inputFile: 'sample.webp', endpoint: '/api/convert/image', targetFormat: 'jpg' },

    // GIF input
    { name: 'GIF → PNG', inputFile: 'sample.gif', endpoint: '/api/convert/image', targetFormat: 'png' },
    { name: 'GIF → WebP', inputFile: 'sample.gif', endpoint: '/api/convert/image', targetFormat: 'webp' },

    // With quality option
    { name: 'PNG → JPEG (quality 90)', inputFile: 'sample.png', endpoint: '/api/convert/image', targetFormat: 'jpg', options: { quality: '90' } },
];

// ============================================================================
// AUDIO CONVERSION TESTS
// ============================================================================
const audioConversions: ConversionTest[] = [
    // MP3 input
    { name: 'MP3 → WAV', inputFile: 'sample.mp3', endpoint: '/api/convert/audio', targetFormat: 'wav' },
    { name: 'MP3 → FLAC', inputFile: 'sample.mp3', endpoint: '/api/convert/audio', targetFormat: 'flac' },
    { name: 'MP3 → OGG', inputFile: 'sample.mp3', endpoint: '/api/convert/audio', targetFormat: 'ogg' },
    { name: 'MP3 → AAC', inputFile: 'sample.mp3', endpoint: '/api/convert/audio', targetFormat: 'aac', timeout: 120000 },

    // WAV input
    { name: 'WAV → MP3', inputFile: 'sample.wav', endpoint: '/api/convert/audio', targetFormat: 'mp3' },
    { name: 'WAV → FLAC', inputFile: 'sample.wav', endpoint: '/api/convert/audio', targetFormat: 'flac' },
    { name: 'WAV → OGG', inputFile: 'sample.wav', endpoint: '/api/convert/audio', targetFormat: 'ogg' },

    // With bitrate option
    { name: 'WAV → MP3 (320k)', inputFile: 'sample.wav', endpoint: '/api/convert/audio', targetFormat: 'mp3', options: { bitrate: '320k' } },
];

// ============================================================================
// VIDEO CONVERSION TESTS
// ============================================================================
const videoConversions: ConversionTest[] = [
    // MP4 input
    { name: 'MP4 → WebM', inputFile: 'sample.mp4', endpoint: '/api/convert/video', targetFormat: 'webm', timeout: 180000 },
    { name: 'MP4 → MKV', inputFile: 'sample.mp4', endpoint: '/api/convert/video', targetFormat: 'mkv', timeout: 180000 },

    // MKV input
    { name: 'MKV → MP4', inputFile: 'sample.mkv', endpoint: '/api/convert/video', targetFormat: 'mp4', timeout: 180000 },
    { name: 'MKV → WebM', inputFile: 'sample.mkv', endpoint: '/api/convert/video', targetFormat: 'webm', timeout: 180000 },

    // With quality options
    { name: 'MKV → MP4 (high quality)', inputFile: 'sample.mkv', endpoint: '/api/convert/video', targetFormat: 'mp4', options: { quality: 'high', codec: 'h264' }, timeout: 300000 },
];

// ============================================================================
// DOCUMENT CONVERSION TESTS
// ============================================================================
const documentConversions: ConversionTest[] = [
    // Markdown input
    { name: 'MD → HTML', inputFile: 'sample.md', endpoint: '/api/convert/document', targetFormat: 'html' },
    { name: 'MD → TXT', inputFile: 'sample.md', endpoint: '/api/convert/document', targetFormat: 'txt' },
    { name: 'MD → PDF', inputFile: 'sample.md', endpoint: '/api/convert/document', targetFormat: 'pdf', timeout: 120000 },

    // TXT input
    { name: 'TXT → HTML', inputFile: 'sample.txt', endpoint: '/api/convert/document', targetFormat: 'html' },

    // DOCX input (if available)
    { name: 'DOCX → PDF', inputFile: 'sample.docx', endpoint: '/api/convert/document', targetFormat: 'pdf', timeout: 180000 },
    { name: 'DOCX → HTML', inputFile: 'sample.docx', endpoint: '/api/convert/document', targetFormat: 'html', timeout: 120000 },
];

// ============================================================================
// TEST EXECUTION
// ============================================================================

function createConversionTest(test: ConversionTest) {
    return async () => {
        // Skip if fixture doesn't exist
        if (!fixtureExists(test.inputFile)) {
            console.log(`⏭ Skipping ${test.name} - fixture ${test.inputFile} not found`);
            return;
        }

        const options = {
            target_format: test.targetFormat,
            ...test.options,
        };

        // Upload and convert
        const jobId = await uploadAndConvert(test.inputFile, test.endpoint, options);
        expect(jobId).toBeDefined();

        // Wait for completion
        const result = await pollUntilComplete(jobId, test.timeout || 60000);
        expect(result.status).toBe('completed');
        expect(result.result.download_url).toBeDefined();

        // Download and validate integrity
        const validation = await downloadAndValidate(result.result.download_url);

        expect(validation.valid).toBe(true);
        if (!validation.valid) {
            console.error(`Integrity check failed for ${test.name}:`, validation.error);
        }

        // Log success with metadata
        console.log(`✓ ${test.name} - Size: ${validation.metadata?.size || 'N/A'} bytes`);
    };
}

describe('Comprehensive Conversion Matrix Tests', () => {

    describe('Image Conversions', () => {
        for (const test of imageConversions) {
            it(test.name, createConversionTest(test), 60000);
        }
    });

    describe('Audio Conversions', () => {
        for (const test of audioConversions) {
            it(test.name, createConversionTest(test), test.timeout || 120000);
        }
    });

    describe('Video Conversions', () => {
        for (const test of videoConversions) {
            it(test.name, createConversionTest(test), test.timeout || 300000);
        }
    });

    describe('Document Conversions', () => {
        for (const test of documentConversions) {
            it(test.name, createConversionTest(test), test.timeout || 120000);
        }
    });

});

// Summary of all tests
console.log('\n📋 Conversion Matrix Test Summary:');
console.log(`   - Image: ${imageConversions.length} tests`);
console.log(`   - Audio: ${audioConversions.length} tests`);
console.log(`   - Video: ${videoConversions.length} tests`);
console.log(`   - Document: ${documentConversions.length} tests`);
console.log(`   - Total: ${imageConversions.length + audioConversions.length + videoConversions.length + documentConversions.length} conversion tests\n`);
