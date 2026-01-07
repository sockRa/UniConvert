# UniConvert

⚡ **Universal File Converter** - A Swiss Army Knife Docker container for video, audio, image, and document conversion.

Exposes FFmpeg, Pandoc, LibreOffice, and Sharp via a unified REST API with async job processing and a modern drag-and-drop web interface.

## Features

- 🎬 **Video Conversion** - MP4, MKV, WebM, AVI, MOV, GIF (via FFmpeg)
- 🎵 **Audio Conversion** - MP3, FLAC, WAV, AAC, OGG, M4A (via FFmpeg)
- 🖼️ **Image Conversion** - PNG, JPG, WebP, AVIF, GIF, TIFF (via Sharp)
- 📄 **Document Conversion** - PDF, DOCX, HTML, Markdown, EPUB (via Pandoc/LibreOffice)
- ⚡ **Async Processing** - Large files are processed in background with job status polling
- 🪝 **Webhook Support** - Get notified when conversions complete
- 🎨 **Modern Web UI** - Drag-and-drop interface for easy conversion
- 🐳 **Docker Ready** - Single container with all tools included

## Quick Start

```bash
# Clone and start
git clone https://github.com/sockRa/UniConvert.git
cd UniConvert
docker-compose up -d

# Open in browser
open http://localhost:3000
```

## API Usage

### Convert Video

```bash
curl -X POST http://localhost:3000/api/convert/video \
  -F "file=@video.mkv" \
  -F "target_format=mp4" \
  -F "codec=h264" \
  -F "quality=high"
```

### Convert Image

```bash
curl -X POST http://localhost:3000/api/convert/image \
  -F "file=@image.webp" \
  -F "target_format=png"
```

### Convert Document

```bash
curl -X POST http://localhost:3000/api/convert/document \
  -F "file=@document.docx" \
  -F "target_format=pdf"
```

### Check Job Status

```bash
curl http://localhost:3000/api/jobs/<job_id>
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/convert/video` | POST | Convert video files |
| `/api/convert/audio` | POST | Convert audio files |
| `/api/convert/image` | POST | Convert image files |
| `/api/convert/document` | POST | Convert document files |
| `/api/convert/auto` | POST | Auto-detect file type and convert |
| `/api/jobs/:id` | GET | Get job status |
| `/api/jobs/:id` | DELETE | Cancel a job |
| `/api/jobs` | GET | List all jobs |
| `/api/health` | GET | Health check |

## Conversion Options

### Video
- `target_format`: mp4, webm, mkv, avi, mov, gif
- `codec`: h264, h265, vp9, av1
- `quality`: low, medium, high, lossless
- `resolution`: 480p, 720p, 1080p, 1440p, 4k, original

### Audio
- `target_format`: mp3, wav, flac, aac, ogg, m4a, opus
- `bitrate`: 64k, 128k, 192k, 256k, 320k

### Image
- `target_format`: png, jpg, webp, avif, gif, tiff
- `quality`: 1-100
- `resize`: { width, height, fit }

### Document
- `target_format`: pdf, docx, html, markdown, txt, epub, odt

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run integration tests (requires Docker)
docker-compose up -d
npm run test:integration
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `REDIS_URL` | redis://localhost:6379 | Redis connection URL |
| `MAX_FILE_SIZE` | 500MB | Maximum upload size |
| `CLEANUP_INTERVAL_HOURS` | 24 | How often to clean old files |
| `FILE_RETENTION_HOURS` | 168 | How long to keep files (7 days) |
| `MAX_CONCURRENT_JOBS` | 3 | Max parallel conversions |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UniConvert                           │
├─────────────────────────────────────────────────────────┤
│  Frontend (Drag & Drop UI)                              │
├─────────────────────────────────────────────────────────┤
│  Express API Server                                     │
│  ├── /api/convert/* (upload & queue jobs)               │
│  ├── /api/jobs/* (status & management)                  │
│  └── /api/health (health check)                         │
├─────────────────────────────────────────────────────────┤
│  BullMQ Job Queue (Redis-backed)                        │
│  ├── Video Queue → FFmpeg Worker                        │
│  ├── Audio Queue → FFmpeg Worker                        │
│  ├── Image Queue → Sharp Worker                         │
│  └── Document Queue → Pandoc/LibreOffice Worker         │
├─────────────────────────────────────────────────────────┤
│  Conversion Tools                                       │
│  ├── FFmpeg (video/audio)                               │
│  ├── Sharp (images)                                     │
│  ├── Pandoc (lightweight documents)                     │
│  └── LibreOffice (office → PDF)                         │
└─────────────────────────────────────────────────────────┘
```

## License

MIT
