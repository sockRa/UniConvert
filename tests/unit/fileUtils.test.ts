import { detectFileType, getOutputFormats, getMimeType } from '../../src/utils/fileUtils';

describe('fileUtils', () => {
    describe('detectFileType', () => {
        test('detects video files', () => {
            expect(detectFileType('video.mp4')).toBe('video');
            expect(detectFileType('movie.mkv')).toBe('video');
            expect(detectFileType('clip.webm')).toBe('video');
        });

        test('detects audio files', () => {
            expect(detectFileType('song.mp3')).toBe('audio');
            expect(detectFileType('track.flac')).toBe('audio');
            expect(detectFileType('sound.wav')).toBe('audio');
        });

        test('detects image files', () => {
            expect(detectFileType('photo.jpg')).toBe('image');
            expect(detectFileType('image.png')).toBe('image');
            expect(detectFileType('graphic.webp')).toBe('image');
        });

        test('detects document files', () => {
            expect(detectFileType('document.pdf')).toBe('document');
            expect(detectFileType('file.docx')).toBe('document');
            expect(detectFileType('readme.md')).toBe('document');
        });

        test('returns unknown for unsupported extensions', () => {
            expect(detectFileType('file.xyz')).toBe('unknown');
            expect(detectFileType('noextension')).toBe('unknown');
        });
    });

    describe('getOutputFormats', () => {
        test('returns video formats', () => {
            const formats = getOutputFormats('video');
            expect(formats).toContain('mp4');
            expect(formats).toContain('webm');
        });

        test('returns audio formats', () => {
            const formats = getOutputFormats('audio');
            expect(formats).toContain('mp3');
            expect(formats).toContain('flac');
        });

        test('returns image formats', () => {
            const formats = getOutputFormats('image');
            expect(formats).toContain('png');
            expect(formats).toContain('jpg');
        });

        test('returns document formats', () => {
            const formats = getOutputFormats('document');
            expect(formats).toContain('pdf');
            expect(formats).toContain('docx');
        });

        test('returns empty array for unknown type', () => {
            expect(getOutputFormats('unknown')).toEqual([]);
        });
    });

    describe('getMimeType', () => {
        test('returns correct MIME types', () => {
            expect(getMimeType('.mp4')).toBe('video/mp4');
            expect(getMimeType('.mp3')).toBe('audio/mpeg');
            expect(getMimeType('.png')).toBe('image/png');
            expect(getMimeType('.pdf')).toBe('application/pdf');
        });

        test('returns octet-stream for unknown extensions', () => {
            expect(getMimeType('.xyz')).toBe('application/octet-stream');
        });
    });
});
