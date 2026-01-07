import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import {
    videoQueue,
    audioQueue,
    imageQueue,
    documentQueue
} from '../queues/conversionQueue.js';
import { detectFileType } from '../utils/fileUtils.js';

export const convertRouter = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: CONFIG.uploadsDir,
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: CONFIG.maxFileSize },
});

// Video conversion endpoint
convertRouter.post('/video', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { target_format, codec, quality, resolution, webhook_url } = req.body;

        if (!target_format) {
            return res.status(400).json({ error: 'target_format is required' });
        }

        const jobId = uuidv4();

        await videoQueue.add(jobId, {
            jobId,
            inputPath: req.file.path,
            originalName: req.file.originalname,
            targetFormat: target_format,
            codec: codec || 'h264',
            quality: quality || 'medium',
            resolution: resolution || 'original',
            webhookUrl: webhook_url,
        });

        res.status(202).json({
            job_id: jobId,
            status: 'queued',
            message: 'Video conversion job queued',
        });
    } catch (error) {
        console.error('Video conversion error:', error);
        res.status(500).json({ error: 'Failed to queue video conversion' });
    }
});

// Audio conversion endpoint
convertRouter.post('/audio', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { target_format, bitrate, webhook_url } = req.body;

        if (!target_format) {
            return res.status(400).json({ error: 'target_format is required' });
        }

        const jobId = uuidv4();

        await audioQueue.add(jobId, {
            jobId,
            inputPath: req.file.path,
            originalName: req.file.originalname,
            targetFormat: target_format,
            bitrate: bitrate || '192k',
            webhookUrl: webhook_url,
        });

        res.status(202).json({
            job_id: jobId,
            status: 'queued',
            message: 'Audio conversion job queued',
        });
    } catch (error) {
        console.error('Audio conversion error:', error);
        res.status(500).json({ error: 'Failed to queue audio conversion' });
    }
});

// Image conversion endpoint
convertRouter.post('/image', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { target_format, quality, resize, webhook_url } = req.body;

        if (!target_format) {
            return res.status(400).json({ error: 'target_format is required' });
        }

        const jobId = uuidv4();

        await imageQueue.add(jobId, {
            jobId,
            inputPath: req.file.path,
            originalName: req.file.originalname,
            targetFormat: target_format,
            quality: quality ? parseInt(quality, 10) : 85,
            resize: resize ? JSON.parse(resize) : undefined,
            webhookUrl: webhook_url,
        });

        res.status(202).json({
            job_id: jobId,
            status: 'queued',
            message: 'Image conversion job queued',
        });
    } catch (error) {
        console.error('Image conversion error:', error);
        res.status(500).json({ error: 'Failed to queue image conversion' });
    }
});

// Document conversion endpoint
convertRouter.post('/document', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { target_format, webhook_url } = req.body;

        if (!target_format) {
            return res.status(400).json({ error: 'target_format is required' });
        }

        const jobId = uuidv4();

        await documentQueue.add(jobId, {
            jobId,
            inputPath: req.file.path,
            originalName: req.file.originalname,
            targetFormat: target_format,
            webhookUrl: webhook_url,
        });

        res.status(202).json({
            job_id: jobId,
            status: 'queued',
            message: 'Document conversion job queued',
        });
    } catch (error) {
        console.error('Document conversion error:', error);
        res.status(500).json({ error: 'Failed to queue document conversion' });
    }
});

// Auto-detect endpoint - routes to correct converter based on file type
convertRouter.post('/auto', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { target_format, webhook_url, ...options } = req.body;

        if (!target_format) {
            return res.status(400).json({ error: 'target_format is required' });
        }

        const fileType = detectFileType(req.file.originalname);
        const jobId = uuidv4();

        const jobData = {
            jobId,
            inputPath: req.file.path,
            originalName: req.file.originalname,
            targetFormat: target_format,
            webhookUrl: webhook_url,
            ...options,
        };

        let queue;
        switch (fileType) {
            case 'video':
                queue = videoQueue;
                break;
            case 'audio':
                queue = audioQueue;
                break;
            case 'image':
                queue = imageQueue;
                break;
            case 'document':
                queue = documentQueue;
                break;
            default:
                return res.status(400).json({ error: `Unsupported file type: ${fileType}` });
        }

        await queue.add(jobId, jobData);

        res.status(202).json({
            job_id: jobId,
            status: 'queued',
            detected_type: fileType,
            message: `${fileType} conversion job queued`,
        });
    } catch (error) {
        console.error('Auto conversion error:', error);
        res.status(500).json({ error: 'Failed to queue conversion' });
    }
});
