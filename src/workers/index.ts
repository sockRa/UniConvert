export { videoWorker } from './videoWorker.js';
export { audioWorker } from './audioWorker.js';
export { imageWorker } from './imageWorker.js';
export { documentWorker } from './documentWorker.js';

export async function startWorkers() {
    // Workers are started by importing them
    console.log('  - Video worker started');
    console.log('  - Audio worker started');
    console.log('  - Image worker started');
    console.log('  - Document worker started');
}
