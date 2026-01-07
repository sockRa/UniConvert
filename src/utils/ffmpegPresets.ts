export const VIDEO_PRESETS: Record<string, { codec: string; preset?: string }> = {
    h264: { codec: 'libx264', preset: 'fast' },
    h265: { codec: 'libx265', preset: 'medium' },
    hevc: { codec: 'libx265', preset: 'medium' },
    vp9: { codec: 'libvpx-vp9' },
    av1: { codec: 'libaom-av1' },
    copy: { codec: 'copy' },
};

export const QUALITY_PRESETS: Record<string, { crf: number }> = {
    low: { crf: 28 },
    medium: { crf: 23 },
    high: { crf: 18 },
    lossless: { crf: 0 },
};

export const RESOLUTION_PRESETS: Record<string, { width: number }> = {
    '480p': { width: 854 },
    '720p': { width: 1280 },
    '1080p': { width: 1920 },
    '1440p': { width: 2560 },
    '4k': { width: 3840 },
};

export const AUDIO_CODECS: Record<string, string> = {
    mp3: 'libmp3lame',
    aac: 'aac',
    m4a: 'aac',
    flac: 'flac',
    wav: 'pcm_s16le',
    ogg: 'libvorbis',
    opus: 'libopus',
};

export const AUDIO_BITRATES: Record<string, string> = {
    '64k': '64k',
    '128k': '128k',
    '192k': '192k',
    '256k': '256k',
    '320k': '320k',
};
