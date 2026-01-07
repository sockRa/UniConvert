const API_URL = process.env.API_URL || 'http://localhost:3000';
const MAX_RETRIES = 60;
const RETRY_INTERVAL_MS = 2000;

async function waitForHealthy() {
    console.log(`Waiting for UniConvert to be healthy at ${API_URL}...`);

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(`${API_URL}/api/health`);

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'ok') {
                    console.log('✓ UniConvert is healthy!');
                    console.log(`  Tools: FFmpeg=${data.tools.ffmpeg}, Pandoc=${data.tools.pandoc}, LibreOffice=${data.tools.libreoffice}, Sharp=${data.tools.sharp}`);
                    process.exit(0);
                }
            }
        } catch (error) {
            // Service not ready yet
        }

        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
    }

    console.error('\n✗ Timeout waiting for UniConvert to be healthy');
    process.exit(1);
}

waitForHealthy();
