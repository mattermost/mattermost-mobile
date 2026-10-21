// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {formatVoiceNoteDuration, getVoiceNoteFileName} from './voice_note';

describe('voice note utils', () => {
    describe('getVoiceNoteFileName', () => {
        it('should build a zero padded local timestamp and length with the m4a extension', () => {
            expect(getVoiceNoteFileName(new Date(2027, 0, 2, 7, 5, 9), 42400)).toBe('voice-note-20270102-070509-0m42s.m4a');
            expect(getVoiceNoteFileName(new Date(2026, 11, 31, 23, 59, 58), 5 * 60 * 1000)).toBe('voice-note-20261231-235958-5m00s.m4a');
        });

        it('should round the length to the nearest second', () => {
            const date = new Date(2026, 9, 20, 14, 35, 1);
            expect(getVoiceNoteFileName(date, 61500)).toBe('voice-note-20261020-143501-1m02s.m4a');
            expect(getVoiceNoteFileName(date, 400)).toBe('voice-note-20261020-143501-0m00s.m4a');
        });
    });

    describe('formatVoiceNoteDuration', () => {
        it('should format as m:ss, flooring partial seconds', () => {
            expect(formatVoiceNoteDuration(0)).toBe('0:00');
            expect(formatVoiceNoteDuration(5999)).toBe('0:05');
            expect(formatVoiceNoteDuration(61000)).toBe('1:01');
            expect(formatVoiceNoteDuration(5 * 60 * 1000)).toBe('5:00');
        });
    });
});
