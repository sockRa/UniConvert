import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const execAsync = promisify(exec);

export interface IntegrityResult {
    valid: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
}

// Magic bytes for different file formats
const MAGIC_BYTES: Record<string, Buffer[]> = {
    // Images
    png: [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
    jpg: [Buffer.from([0xFF, 0xD8, 0xFF])],
    jpeg: [Buffer.from([0xFF, 0xD8, 0xFF])],
    gif: [Buffer.from([0x47, 0x49, 0x46, 0x38])],
    webp: [Buffer.from('RIFF')],
    tiff: [Buffer.from([0x49, 0x49, 0x2A, 0x00]), Buffer.from([0x4D, 0x4D, 0x00, 0x2A])],
    avif: [Buffer.from([0x00, 0x00, 0x00])], // ftyp box start

    // Audio
    mp3: [Buffer.from([0xFF, 0xFB]), Buffer.from([0xFF, 0xFA]), Buffer.from([0x49, 0x44, 0x33])], // MP3 frame or ID3 tag
    wav: [Buffer.from('RIFF')],
    flac: [Buffer.from('fLaC')],
    ogg: [Buffer.from('OggS')],
    aac: [Buffer.from([0xFF, 0xF1]), Buffer.from([0xFF, 0xF9])],
    m4a: [Buffer.from([0x00, 0x00, 0x00])], // ftyp box
    opus: [Buffer.from('OggS')],

    // Video
    mp4: [Buffer.from([0x00, 0x00, 0x00])], // ftyp box start
    mkv: [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
    webm: [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
    avi: [Buffer.from('RIFF')],

    // Documents
    pdf: [Buffer.from('%PDF')],
    html: [Buffer.from('<!'), Buffer.from('<html'), Buffer.from('<HTML')],
    docx: [Buffer.from([0x50, 0x4B, 0x03, 0x04])], // ZIP archive
    epub: [Buffer.from([0x50, 0x4B, 0x03, 0x04])], // ZIP archive
};

/**
 * Check if file starts with expected magic bytes
 */
async function checkMagicBytes(filePath: string, format: string): Promise<boolean> {
    const expectedBytes = MAGIC_BYTES[format.toLowerCase()];
    if (!expectedBytes) return true; // No magic bytes defined, skip check

    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    await fd.read(buffer, 0, 12, 0);
    await fd.close();

    return expectedBytes.some(magic => buffer.subarray(0, magic.length).equals(magic));
}

/**
 * Validate image file integrity using Sharp
 */
export async function validateImage(filePath: string, format: string): Promise<IntegrityResult> {
    try {
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
            return { valid: false, error: 'File is empty' };
        }

        // Check magic bytes
        if (!await checkMagicBytes(filePath, format)) {
            return { valid: false, error: `Invalid magic bytes for ${format}` };
        }

        // Use Sharp to read and validate the image
        const metadata = await sharp(filePath).metadata();

        if (!metadata.width || !metadata.height) {
            return { valid: false, error: 'Image has no dimensions' };
        }

        if (metadata.width < 1 || metadata.height < 1) {
            return { valid: false, error: 'Image dimensions are invalid' };
        }

        return {
            valid: true,
            metadata: {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: stats.size,
            },
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error reading image',
        };
    }
}

/**
 * Validate audio/video file integrity using FFprobe
 */
export async function validateMedia(filePath: string, format: string): Promise<IntegrityResult> {
    try {
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
            return { valid: false, error: 'File is empty' };
        }

        // Check magic bytes
        if (!await checkMagicBytes(filePath, format)) {
            return { valid: false, error: `Invalid magic bytes for ${format}` };
        }

        // Use FFprobe to analyze the file
        const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration,format_name -show_entries stream=codec_type,codec_name -of json "${filePath}"`
        );

        const probeData = JSON.parse(stdout);

        if (!probeData.format) {
            return { valid: false, error: 'FFprobe could not read format info' };
        }

        const duration = Number.parseFloat(probeData.format.duration);
        if (Number.isNaN(duration) || duration <= 0) {
            return { valid: false, error: 'Media has no valid duration' };
        }

        const streams = probeData.streams || [];
        const hasAudioOrVideo = streams.some((s: any) =>
            s.codec_type === 'audio' || s.codec_type === 'video'
        );

        if (!hasAudioOrVideo) {
            return { valid: false, error: 'No audio or video streams found' };
        }

        return {
            valid: true,
            metadata: {
                duration,
                format: probeData.format.format_name,
                streams: streams.map((s: any) => ({
                    type: s.codec_type,
                    codec: s.codec_name,
                })),
                size: stats.size,
            },
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error analyzing media',
        };
    }
}

/**
 * Validate document file integrity
 */
export async function validateDocument(filePath: string, format: string): Promise<IntegrityResult> {
    try {
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
            return { valid: false, error: 'File is empty' };
        }

        // Check magic bytes for binary formats
        const binaryFormats = ['pdf', 'docx', 'epub'];
        if (binaryFormats.includes(format.toLowerCase())) {
            if (!await checkMagicBytes(filePath, format)) {
                return { valid: false, error: `Invalid magic bytes for ${format}` };
            }
        }

        // For text formats, verify content is readable
        const textFormats = ['html', 'txt', 'markdown', 'md'];
        if (textFormats.includes(format.toLowerCase())) {
            const content = await fs.readFile(filePath, 'utf-8');
            if (content.trim().length === 0) {
                return { valid: false, error: 'Document content is empty' };
            }

            // For HTML, check for basic structure
            if (format.toLowerCase() === 'html') {
                if (!content.includes('<') || !content.includes('>')) {
                    return { valid: false, error: 'HTML document has no tags' };
                }
            }

            return {
                valid: true,
                metadata: {
                    size: stats.size,
                    contentLength: content.length,
                },
            };
        }

        return {
            valid: true,
            metadata: {
                size: stats.size,
            },
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error reading document',
        };
    }
}

/**
 * Auto-detect and validate file based on extension
 */
export async function validateFile(filePath: string): Promise<IntegrityResult> {
    const ext = path.extname(filePath).toLowerCase().slice(1);

    const imageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tiff', 'tif', 'avif'];
    const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'];
    const videoFormats = ['mp4', 'mkv', 'webm', 'avi', 'mov'];
    const documentFormats = ['pdf', 'html', 'txt', 'markdown', 'md', 'docx', 'epub'];

    if (imageFormats.includes(ext)) {
        return validateImage(filePath, ext);
    } else if (audioFormats.includes(ext)) {
        return validateMedia(filePath, ext);
    } else if (videoFormats.includes(ext)) {
        return validateMedia(filePath, ext);
    } else if (documentFormats.includes(ext)) {
        return validateDocument(filePath, ext);
    }

    return { valid: false, error: `Unknown format: ${ext}` };
}
