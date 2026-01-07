import { execSync } from 'child_process';

function checkDockerSize() {
    try {
        const output = execSync('docker images uniconvert --format "{{.Size}}"', {
            encoding: 'utf-8',
        }).trim();

        if (!output) {
            console.error('Docker image "uniconvert" not found');
            console.log('Run "docker build -t uniconvert ." first');
            process.exit(1);
        }

        const sizeGB = parseDockerSize(output);
        const maxSizeGB = 1.5;

        console.log(`Docker image size: ${output}`);
        console.log(`Size in GB: ${sizeGB.toFixed(3)} GB`);
        console.log(`Max allowed: ${maxSizeGB} GB`);

        if (sizeGB > maxSizeGB) {
            console.error(`✗ Image size exceeds limit!`);
            process.exit(1);
        }

        console.log('✓ Image size is within limits');
        process.exit(0);
    } catch (error) {
        console.error('Failed to check Docker image size:', error);
        process.exit(1);
    }
}

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

checkDockerSize();
