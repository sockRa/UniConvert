import { Router } from 'express';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const healthRouter = Router();

interface ToolStatus {
    ffmpeg: boolean;
    pandoc: boolean;
    libreoffice: boolean;
    sharp: boolean;
}

async function checkTool(command: string): Promise<boolean> {
    try {
        await execAsync(command);
        return true;
    } catch {
        return false;
    }
}

healthRouter.get('/', async (req, res) => {
    const tools: ToolStatus = {
        ffmpeg: await checkTool('ffmpeg -version'),
        pandoc: await checkTool('pandoc --version'),
        libreoffice: await checkTool('soffice --version'),
        sharp: true, // Sharp is always available if the app starts
    };

    const allToolsAvailable = Object.values(tools).every(Boolean);

    res.json({
        status: allToolsAvailable ? 'ok' : 'degraded',
        tools,
        timestamp: new Date().toISOString(),
    });
});
