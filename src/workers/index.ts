import { videoWorker } from './videoWorker.js';
import { audioWorker } from './audioWorker.js';
import { imageWorker } from './imageWorker.js';
import { documentWorker } from './documentWorker.js';

export async function startWorkers() {
    // Workers are started by importing them
    console.log('  - Video worker started');
    console.log('  - Audio worker started');
    console.log('  - Image worker started');
    console.log('  - Document worker started');
}
