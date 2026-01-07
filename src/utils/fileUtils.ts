import path from 'path';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv', '.flv', '.m4v', '.3gp'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.avif', '.svg', '.ico'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp', '.txt', '.md', '.markdown', '.html', '.htm', '.epub', '.rtf', '.rst'];

export type FileType = 'video' | 'audio' | 'image' | 'document' | 'unknown';

export function detectFileType(filename: string): FileType {
    const ext = path.extname(filename).toLowerCase();

    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';

    return 'unknown';
}

export function getOutputFormats(fileType: FileType): string[] {
    switch (fileType) {
        case 'video':
            return ['mp4', 'webm', 'mkv', 'avi', 'mov', 'gif'];
        case 'audio':
            return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'];
        case 'image':
            return ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'tiff'];
        case 'document':
            return ['pdf', 'docx', 'html', 'markdown', 'txt', 'epub', 'odt'];
        default:
            return [];
    }
}

export function getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
        // Video
        '.mp4': 'video/mp4',
        '.mkv': 'video/x-matroska',
        '.webm': 'video/webm',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        // Audio
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        // Image
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.avif': 'image/avif',
        // Document
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}
