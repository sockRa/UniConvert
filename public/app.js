// ===== UniConvert Frontend Application =====

const API_BASE = '/api';

// File type configurations
const FILE_TYPES = {
    video: {
        icon: '🎬',
        extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv', 'm4v'],
        formats: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'gif'],
        options: ['quality', 'codec', 'resolution'],
    },
    audio: {
        icon: '🎵',
        extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'],
        formats: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'],
        options: ['bitrate'],
    },
    image: {
        icon: '🖼️',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'avif', 'svg'],
        formats: ['png', 'jpg', 'webp', 'avif', 'gif', 'tiff'],
        options: ['quality'],
    },
    document: {
        icon: '📄',
        extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'txt', 'md', 'html', 'epub', 'rtf'],
        formats: ['pdf', 'docx', 'html', 'markdown', 'txt', 'epub', 'odt'],
        options: [],
    },
};

// State
let selectedFile = null;
let activeJobs = new Map();
let completedJobs = [];

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const optionsSection = document.getElementById('optionsSection');
const jobsSection = document.getElementById('jobsSection');
const completedSection = document.getElementById('completedSection');
const jobsList = document.getElementById('jobsList');
const completedList = document.getElementById('completedList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupDropzone();
    setupOptions();
    loadCompletedJobs();
});

// ===== Dropzone Setup =====
function setupDropzone() {
    // Click to browse
    dropzone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

// ===== Handle File Selection =====
function handleFile(file) {
    selectedFile = file;

    const ext = file.name.split('.').pop().toLowerCase();
    const fileType = detectFileType(ext);

    if (!fileType) {
        alert('Unsupported file type');
        return;
    }

    // Update UI
    document.getElementById('fileIcon').textContent = FILE_TYPES[fileType].icon;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatSize(file.size);

    // Populate format options
    const formatSelect = document.getElementById('targetFormat');
    formatSelect.innerHTML = '<option value="">Select format...</option>';
    FILE_TYPES[fileType].formats.forEach(format => {
        const option = document.createElement('option');
        option.value = format;
        option.textContent = format.toUpperCase();
        formatSelect.appendChild(option);
    });

    // Show/hide relevant options
    const allOptions = ['qualityGroup', 'codecGroup', 'resolutionGroup', 'bitrateGroup'];
    allOptions.forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
    });

    FILE_TYPES[fileType].options.forEach(opt => {
        const el = document.getElementById(opt + 'Group');
        if (el) el.classList.remove('hidden');
    });

    // Show options section
    optionsSection.classList.remove('hidden');
    dropzone.classList.add('hidden');
}

function detectFileType(ext) {
    for (const [type, config] of Object.entries(FILE_TYPES)) {
        if (config.extensions.includes(ext)) return type;
    }
    return null;
}

// ===== Options Setup =====
function setupOptions() {
    // Clear file button
    document.getElementById('clearFile').addEventListener('click', clearFile);

    // Convert button
    document.getElementById('convertBtn').addEventListener('click', startConversion);
}

function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    optionsSection.classList.add('hidden');
    dropzone.classList.remove('hidden');
}

// ===== Conversion =====
async function startConversion() {
    if (!selectedFile) return;

    const targetFormat = document.getElementById('targetFormat').value;
    if (!targetFormat) {
        alert('Please select a target format');
        return;
    }

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const fileType = detectFileType(ext);

    // Build form data
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('target_format', targetFormat);

    // Add type-specific options
    if (FILE_TYPES[fileType].options.includes('quality')) {
        formData.append('quality', document.getElementById('quality').value);
    }
    if (FILE_TYPES[fileType].options.includes('codec')) {
        formData.append('codec', document.getElementById('codec').value);
    }
    if (FILE_TYPES[fileType].options.includes('resolution')) {
        formData.append('resolution', document.getElementById('resolution').value);
    }
    if (FILE_TYPES[fileType].options.includes('bitrate')) {
        formData.append('bitrate', document.getElementById('bitrate').value);
    }

    // Disable button during upload
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = true;
    convertBtn.querySelector('.btn-text').textContent = 'Uploading...';

    try {
        const response = await fetch(`${API_BASE}/convert/${fileType}`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Conversion failed');
        }

        // Add to active jobs
        addActiveJob({
            id: data.job_id,
            name: selectedFile.name,
            targetFormat,
            type: fileType,
            status: 'queued',
            progress: 0,
        });

        // Clear the file selection
        clearFile();

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        convertBtn.disabled = false;
        convertBtn.querySelector('.btn-text').textContent = 'Convert Now';
    }
}

// ===== Job Management =====
function addActiveJob(job) {
    activeJobs.set(job.id, job);
    updateJobsUI();
    startPolling(job.id);
}

function updateJobsUI() {
    if (activeJobs.size === 0) {
        jobsSection.classList.add('hidden');
        return;
    }

    jobsSection.classList.remove('hidden');
    jobsList.innerHTML = '';

    activeJobs.forEach(job => {
        jobsList.appendChild(createJobCard(job));
    });
}

function createJobCard(job) {
    const card = document.createElement('div');
    card.className = `job-card ${job.status === 'processing' ? 'processing' : ''}`;
    card.id = `job-${job.id}`;

    const fileType = FILE_TYPES[job.type] || FILE_TYPES.document;

    card.innerHTML = `
    <div class="job-icon">${fileType.icon}</div>
    <div class="job-details">
      <div class="job-name">${job.name} → ${job.targetFormat.toUpperCase()}</div>
      <div class="job-status">${formatStatus(job.status)}</div>
    </div>
    <div class="job-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${job.progress}%"></div>
      </div>
      <div class="progress-text">${job.progress}%</div>
    </div>
    <div class="job-actions">
      <button class="btn-cancel" onclick="cancelJob('${job.id}')" title="Cancel">✕</button>
    </div>
  `;

    return card;
}

function formatStatus(status) {
    const statuses = {
        queued: '⏳ Queued',
        processing: '⚙️ Processing',
        completed: '✅ Completed',
        failed: '❌ Failed',
    };
    return statuses[status] || status;
}

// ===== Polling =====
async function startPolling(jobId) {
    const poll = async () => {
        try {
            const response = await fetch(`${API_BASE}/jobs/${jobId}`);
            const data = await response.json();

            const job = activeJobs.get(jobId);
            if (!job) return;

            job.status = data.status;
            job.progress = data.progress || 0;

            if (data.status === 'completed') {
                job.result = data.result;
                moveToCompleted(job);
                return;
            }

            if (data.status === 'failed') {
                job.error = data.error;
                moveToCompleted(job);
                return;
            }

            updateJobCard(job);
            setTimeout(poll, 1000);

        } catch (error) {
            console.error('Polling error:', error);
            setTimeout(poll, 3000);
        }
    };

    poll();
}

function updateJobCard(job) {
    const card = document.getElementById(`job-${job.id}`);
    if (!card) return;

    card.className = `job-card ${job.status === 'processing' ? 'processing' : ''}`;
    card.querySelector('.job-status').textContent = formatStatus(job.status);
    card.querySelector('.progress-fill').style.width = `${job.progress}%`;
    card.querySelector('.progress-text').textContent = `${job.progress}%`;
}

function moveToCompleted(job) {
    activeJobs.delete(job.id);
    completedJobs.unshift(job);
    saveCompletedJobs();
    updateJobsUI();
    updateCompletedUI();
}

// ===== Completed Jobs =====
function updateCompletedUI() {
    if (completedJobs.length === 0) {
        completedSection.classList.add('hidden');
        return;
    }

    completedSection.classList.remove('hidden');
    completedList.innerHTML = '';

    completedJobs.slice(0, 10).forEach(job => {
        completedList.appendChild(createCompletedCard(job));
    });
}

function createCompletedCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';

    const fileType = FILE_TYPES[job.type] || FILE_TYPES.document;
    const isSuccess = job.status === 'completed';

    card.innerHTML = `
    <div class="job-icon">${fileType.icon}</div>
    <div class="job-details">
      <div class="job-name">${job.name} → ${job.targetFormat.toUpperCase()}</div>
      <div class="job-status">${formatStatus(job.status)}</div>
    </div>
    <div class="job-actions">
      ${isSuccess ? `<a href="${job.result.download_url}" class="btn-download" download>Download</a>` : ''}
    </div>
  `;

    return card;
}

// ===== Cancel Job =====
async function cancelJob(jobId) {
    try {
        await fetch(`${API_BASE}/jobs/${jobId}`, { method: 'DELETE' });
        activeJobs.delete(jobId);
        updateJobsUI();
    } catch (error) {
        console.error('Cancel error:', error);
    }
}

// ===== Local Storage =====
function saveCompletedJobs() {
    localStorage.setItem('uniconvert_completed', JSON.stringify(completedJobs.slice(0, 20)));
}

function loadCompletedJobs() {
    try {
        const saved = localStorage.getItem('uniconvert_completed');
        if (saved) {
            completedJobs = JSON.parse(saved);
            updateCompletedUI();
        }
    } catch (error) {
        console.error('Load error:', error);
    }
}

// ===== Utilities =====
function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}
