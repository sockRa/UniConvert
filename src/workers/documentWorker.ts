import { Worker, Job } from 'bullmq';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { CONFIG } from '../config.js';
import { getRedisOptions } from '../queues/conversionQueue.js';
import { sendWebhook } from '../services/webhookService.js';

const execAsync = promisify(exec);

interface DocumentJobData {
    jobId: string;
    inputPath: string;
    originalName: string;
    targetFormat: string;
    webhookUrl?: string;
}

// Formats handled by Pandoc
const PANDOC_FORMATS = new Set(['html', 'markdown', 'md', 'txt', 'epub', 'rst', 'docx', 'odt', 'rtf']);

// Input formats that need LibreOffice for PDF conversion
const OFFICE_INPUT_EXTENSIONS = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp']);

async function processDocumentJob(job: Job<DocumentJobData>) {
    const { jobId, inputPath, originalName, targetFormat, webhookUrl } = job.data;

    const baseName = path.basename(originalName, path.extname(originalName));
    const inputExt = path.extname(originalName).toLowerCase();
    const outputFilename = `${jobId}_${baseName}.${targetFormat}`;
    const outputPath = path.join(CONFIG.outputsDir, outputFilename);

    try {
        await job.updateProgress(10);

        // Determine which tool to use
        const isOfficeToPdf = targetFormat === 'pdf' && OFFICE_INPUT_EXTENSIONS.has(inputExt);
        const usePandoc = PANDOC_FORMATS.has(targetFormat) && !isOfficeToPdf;

        if (isOfficeToPdf) {
            // Use LibreOffice for Office → PDF conversion
            await job.updateProgress(30);

            await execAsync(
                `soffice --headless --convert-to pdf --outdir "${CONFIG.outputsDir}" "${inputPath}"`
            );

            // LibreOffice outputs to same basename with .pdf extension
            const libreOfficeOutput = path.join(
                CONFIG.outputsDir,
                `${path.basename(inputPath, path.extname(inputPath))}.pdf`
            );

            // Rename to our expected output name
            await fs.rename(libreOfficeOutput, outputPath);

        } else if (usePandoc) {
            // Use Pandoc for document format conversions
            await job.updateProgress(30);

            await execAsync(
                `pandoc "${inputPath}" -o "${outputPath}" --standalone`
            );

        } else if (targetFormat === 'pdf') {
            // Use Pandoc for non-Office to PDF (e.g., Markdown to PDF)
            await job.updateProgress(30);

            // Pandoc can convert to PDF if a LaTeX engine is available
            // Fallback: convert to HTML first, then use wkhtmltopdf if available
            try {
                await execAsync(`pandoc "${inputPath}" -o "${outputPath}" --pdf-engine=pdflatex`);
            } catch {
                // Fallback: Use LibreOffice to convert via ODT
                const tempOdt = path.join(CONFIG.outputsDir, `${jobId}_temp.odt`);
                await execAsync(`pandoc "${inputPath}" -o "${tempOdt}"`);
                await execAsync(`soffice --headless --convert-to pdf --outdir "${CONFIG.outputsDir}" "${tempOdt}"`);

                const tempPdf = path.join(CONFIG.outputsDir, `${jobId}_temp.pdf`);
                await fs.rename(tempPdf, outputPath);
                await fs.unlink(tempOdt).catch(() => { });
            }
        } else {
            throw new Error(`Unsupported target format: ${targetFormat}`);
        }

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

export const documentWorker = new Worker('document-conversion', processDocumentJob, {
    connection: getRedisOptions(),
    concurrency: 2, // LibreOffice is heavy, limit concurrency
});

documentWorker.on('failed', (job, err) => {
    console.error(`Document job ${job?.id} failed:`, err.message);
});
