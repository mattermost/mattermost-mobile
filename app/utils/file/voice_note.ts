// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const VOICE_NOTE_MAX_DURATION_MS = 5 * 60 * 1000;
export const VOICE_NOTE_EXTENSION = 'm4a';
export const VOICE_NOTE_MIME_TYPE = 'audio/mp4';

// AAC-LC mono at 48 kbps is plenty for speech and keeps a 5 minute note under 2 MB.
export const VOICE_NOTE_SAMPLE_RATE = 44100;
export const VOICE_NOTE_CHANNELS = 1;
export const VOICE_NOTE_BIT_RATE = 48000;

const pad = (value: number) => value.toString().padStart(2, '0');

/**
 * Builds the file name for a voice note recorded at the given (local) time, with the
 * recording length so it is visible on every client, e.g. `voice-note-20261020-143501-0m42s.m4a`.
 * The `.m4a` extension matters: the server derives the attachment MIME type from it.
 */
export const getVoiceNoteFileName = (date: Date, durationMs: number) => {
    const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const length = `${Math.floor(totalSeconds / 60)}m${pad(totalSeconds % 60)}s`;
    return `voice-note-${day}-${time}-${length}.${VOICE_NOTE_EXTENSION}`;
};

/**
 * Formats a duration in milliseconds as `m:ss` for the recording timer.
 */
export const formatVoiceNoteDuration = (durationMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${pad(seconds)}`;
};
