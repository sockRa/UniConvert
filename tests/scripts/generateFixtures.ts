import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const execAsync = promisify(exec);
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

interface FixtureConfig {
    name: string;
    generate: () => Promise<void>;
}

// Ensure fixtures directory exists
async function ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
}

// Generate a simple test image with a unique color
async function generateImage(filename: string, format: keyof sharp.FormatEnum, color: string) {
    const filePath = path.join(FIXTURES_DIR, filename);

    // Create a 100x100 image with solid color and a diagonal line for visual verification
    const width = 100;
    const height = 100;

    const svg = `
        <svg width="${width}" height="${height}">
            <rect width="100%" height="100%" fill="${color}"/>
            <line x1="0" y1="0" x2="100" y2="100" stroke="white" stroke-width="2"/>
            <text x="50" y="55" font-size="12" text-anchor="middle" fill="white">TEST</text>
        </svg>
    `;

    await sharp(Buffer.from(svg))
        .toFormat(format)
        .toFile(filePath);

    console.log(`✓ Generated ${filename}`);
}

// Generate audio file using FFmpeg
async function generateAudio(filename: string, format: string) {
    const filePath = path.join(FIXTURES_DIR, filename);

    // Generate 1 second of 440Hz sine wave
    const ffmpegArgs = [
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=1',
        '-y', // Overwrite
    ];

    // Add format-specific options
    switch (format) {
        case 'mp3':
            ffmpegArgs.push('-codec:a', 'libmp3lame', '-b:a', '128k');
            break;
        case 'wav':
            ffmpegArgs.push('-codec:a', 'pcm_s16le');
            break;
        case 'flac':
            ffmpegArgs.push('-codec:a', 'flac');
            break;
        case 'ogg':
            ffmpegArgs.push('-codec:a', 'libvorbis');
            break;
    }

    ffmpegArgs.push(filePath);

    await execAsync(`ffmpeg ${ffmpegArgs.join(' ')}`);
    console.log(`✓ Generated ${filename}`);
}

// Generate video file using FFmpeg
async function generateVideo(filename: string, format: string) {
    const filePath = path.join(FIXTURES_DIR, filename);

    // Generate 1 second of color bars test pattern
    const ffmpegArgs = [
        '-f', 'lavfi',
        '-i', 'testsrc=duration=1:size=320x240:rate=30',
        '-f', 'lavfi',
        '-i', 'sine=frequency=1000:duration=1',
        '-y',
    ];

    // Add format-specific options
    switch (format) {
        case 'mp4':
            ffmpegArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac');
            break;
        case 'mkv':
            ffmpegArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac');
            break;
        case 'webm':
            ffmpegArgs.push('-c:v', 'libvpx', '-c:a', 'libvorbis');
            break;
    }

    ffmpegArgs.push(filePath);

    await execAsync(`ffmpeg ${ffmpegArgs.join(' ')}`);
    console.log(`✓ Generated ${filename}`);
}

// Generate document files
async function generateDocument(filename: string, content: string) {
    const filePath = path.join(FIXTURES_DIR, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✓ Generated ${filename}`);
}

// Generate DOCX using LibreOffice (convert from ODT)
async function generateDocx() {
    const odtContent = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
    office:mimetype="application/vnd.oasis.opendocument.text"
    office:version="1.2">
    <office:body>
        <office:text>
            <text:p>Test Document Content</text:p>
            <text:p>This is a test document for conversion testing.</text:p>
        </office:text>
    </office:body>
</office:document>`;

    const tempOdt = path.join(FIXTURES_DIR, 'temp.fodt');
    await fs.writeFile(tempOdt, odtContent, 'utf-8');

    try {
        await execAsync(`soffice --headless --convert-to docx --outdir "${FIXTURES_DIR}" "${tempOdt}"`);
        await fs.rename(path.join(FIXTURES_DIR, 'temp.docx'), path.join(FIXTURES_DIR, 'sample.docx'));
        console.log(`✓ Generated sample.docx`);
    } catch (error) {
        console.warn('⚠ Could not generate DOCX (LibreOffice not available), will skip DOCX tests');
        console.warn(error instanceof Error ? error.message : String(error));
    } finally {
        await fs.unlink(tempOdt).catch(() => { });
    }
}

// All fixtures to generate
const fixtures: FixtureConfig[] = [
    // Images
    { name: 'sample.png', generate: () => generateImage('sample.png', 'png', '#FF5733') },
    { name: 'sample.jpg', generate: () => generateImage('sample.jpg', 'jpeg', '#33FF57') },
    { name: 'sample.webp', generate: () => generateImage('sample.webp', 'webp', '#3357FF') },
    { name: 'sample.gif', generate: () => generateImage('sample.gif', 'gif', '#FF33F5') },
    { name: 'sample.tiff', generate: () => generateImage('sample.tiff', 'tiff', '#F5FF33') },

    // Audio
    { name: 'sample.mp3', generate: () => generateAudio('sample.mp3', 'mp3') },
    { name: 'sample.wav', generate: () => generateAudio('sample.wav', 'wav') },

    // Video
    { name: 'sample.mp4', generate: () => generateVideo('sample.mp4', 'mp4') },
    { name: 'sample.mkv', generate: () => generateVideo('sample.mkv', 'mkv') },

    // Documents
    {
        name: 'sample.md',
        generate: () => generateDocument('sample.md', `# Test Document

This is a **Markdown** test file for conversion testing.

## Features
- Bullet points
- *Italic text*
- **Bold text**

> A blockquote for testing.

\`\`\`javascript
console.log('Code block test');
\`\`\`
`)
    },
    {
        name: 'sample.txt',
        generate: () => generateDocument('sample.txt', 'This is a plain text test file.\nIt has multiple lines.\nUsed for conversion testing.')
    },
    { name: 'sample.docx', generate: generateDocx },
];

async function main() {
    console.log('🔧 Generating test fixtures...\n');

    await ensureDir(FIXTURES_DIR);

    let success = 0;
    let failed = 0;

    for (const fixture of fixtures) {
        try {
            await fixture.generate();
            success++;
        } catch (error) {
            console.error(`✗ Failed to generate ${fixture.name}:`, error instanceof Error ? error.message : error);
            failed++;
        }
    }

    console.log(`\n📊 Generated ${success}/${fixtures.length} fixtures`);
    if (failed > 0) {
        console.log(`⚠ ${failed} fixtures failed (some tests may be skipped)`);
    }
}

try {
    await main();
} catch (error) {
    console.error(error);
    process.exit(1);
}
