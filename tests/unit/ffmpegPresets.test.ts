import { VIDEO_PRESETS, QUALITY_PRESETS, RESOLUTION_PRESETS, AUDIO_CODECS, AUDIO_BITRATES } from '../../src/utils/ffmpegPresets';

describe('ffmpegPresets', () => {
    describe('VIDEO_PRESETS', () => {
        test('h264 preset exists with correct codec', () => {
            expect(VIDEO_PRESETS.h264).toBeDefined();
            expect(VIDEO_PRESETS.h264.codec).toBe('libx264');
        });

        test('h265 preset exists with correct codec', () => {
            expect(VIDEO_PRESETS.h265).toBeDefined();
            expect(VIDEO_PRESETS.h265.codec).toBe('libx265');
        });

        test('vp9 preset exists with correct codec', () => {
            expect(VIDEO_PRESETS.vp9).toBeDefined();
            expect(VIDEO_PRESETS.vp9.codec).toBe('libvpx-vp9');
        });
    });

    describe('QUALITY_PRESETS', () => {
        test('all quality levels exist', () => {
            expect(QUALITY_PRESETS.low).toBeDefined();
            expect(QUALITY_PRESETS.medium).toBeDefined();
            expect(QUALITY_PRESETS.high).toBeDefined();
            expect(QUALITY_PRESETS.lossless).toBeDefined();
        });

        test('CRF values are in correct order', () => {
            expect(QUALITY_PRESETS.low.crf).toBeGreaterThan(QUALITY_PRESETS.medium.crf);
            expect(QUALITY_PRESETS.medium.crf).toBeGreaterThan(QUALITY_PRESETS.high.crf);
            expect(QUALITY_PRESETS.lossless.crf).toBe(0);
        });
    });

    describe('RESOLUTION_PRESETS', () => {
        test('common resolutions exist', () => {
            expect(RESOLUTION_PRESETS['720p']).toBeDefined();
            expect(RESOLUTION_PRESETS['1080p']).toBeDefined();
            expect(RESOLUTION_PRESETS['4k']).toBeDefined();
        });

        test('resolutions increase correctly', () => {
            expect(RESOLUTION_PRESETS['1080p'].width).toBeGreaterThan(RESOLUTION_PRESETS['720p'].width);
            expect(RESOLUTION_PRESETS['4k'].width).toBeGreaterThan(RESOLUTION_PRESETS['1080p'].width);
        });
    });

    describe('AUDIO_CODECS', () => {
        test('mp3 uses lame encoder', () => {
            expect(AUDIO_CODECS.mp3).toBe('libmp3lame');
        });

        test('flac uses native codec', () => {
            expect(AUDIO_CODECS.flac).toBe('flac');
        });
    });

    describe('AUDIO_BITRATES', () => {
        test('common bitrates exist', () => {
            expect(AUDIO_BITRATES['128k']).toBe('128k');
            expect(AUDIO_BITRATES['192k']).toBe('192k');
            expect(AUDIO_BITRATES['320k']).toBe('320k');
        });
    });
});
