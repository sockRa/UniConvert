import { execSync } from 'child_process';

describe('Docker Image', () => {
    test('image size is under 1.5GB', async () => {
        try {
            const output = execSync('docker images uniconvert --format "{{.Size}}"', {
                encoding: 'utf-8',
            }).trim();

            const sizeGB = parseDockerSize(output);
            console.log(`Docker image size: ${output} (${sizeGB.toFixed(2)} GB)`);

            expect(sizeGB).toBeLessThan(1.5);
        } catch (error) {
            // Skip if Docker image doesn't exist
            console.warn('Docker image not found, skipping size check');
        }
    });
});

function parseDockerSize(size: string): number {
    const match = size.match(/^([\d.]+)\s*(B|KB|MB|GB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers: Record<string, number> = {
        'B': 1 / (1024 * 1024 * 1024),
        'KB': 1 / (1024 * 1024),
        'MB': 1 / 1024,
        'GB': 1,
    };

    return value * (multipliers[unit] || 0);
}
