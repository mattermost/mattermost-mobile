// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {File} from 'expo-file-system';

import {deleteVoiceNoteFile, formatVoiceNoteDuration, getVoiceNoteFileName} from './voice_note';

describe('voice note utils', () => {
    describe('getVoiceNoteFileName', () => {
        it('should build a zero padded local timestamp and length with the m4a extension', () => {
            expect(getVoiceNoteFileName(new Date(2027, 0, 2, 7, 5, 9), 42400)).toBe('voice-note-20270102-070509-0m42s.m4a');
            expect(getVoiceNoteFileName(new Date(2026, 11, 31, 23, 59, 58), 5 * 60 * 1000)).toBe('voice-note-20261231-235958-5m00s.m4a');
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

    describe('deleteVoiceNoteFile', () => {
        const MockFile = jest.mocked(File);
        const lastFile = () => MockFile.mock.results[MockFile.mock.results.length - 1].value;

        it('should delete the recording, adding the file:// prefix to a bare path', () => {
            deleteVoiceNoteFile('/tmp/voice-note.m4a');

            expect(MockFile).toHaveBeenCalledTimes(1);
            expect(MockFile).toHaveBeenCalledWith('file:///tmp/voice-note.m4a');
            expect(lastFile().delete).toHaveBeenCalledTimes(1);
        });

        it('should do nothing when there is no recording', () => {
            deleteVoiceNoteFile(null);

            expect(MockFile).not.toHaveBeenCalled();
        });

        it('should not delete a file that is no longer on disk', () => {
            const createDefaultFile = MockFile.getMockImplementation() as (uri: string) => File;
            MockFile.mockImplementationOnce((uri) => Object.assign(createDefaultFile(String(uri)), {exists: false}));

            deleteVoiceNoteFile('file:///tmp/voice-note.m4a');

            expect(lastFile().delete).not.toHaveBeenCalled();
        });

        it('should not throw when the file cannot be deleted', () => {
            const createDefaultFile = MockFile.getMockImplementation() as (uri: string) => File;
            MockFile.mockImplementationOnce((uri) => Object.assign(createDefaultFile(String(uri)), {
                delete: jest.fn(() => {
                    throw new Error('permission denied');
                }),
            }));

            expect(() => deleteVoiceNoteFile('file:///tmp/voice-note.m4a')).not.toThrow();
            expect(lastFile().delete).toHaveBeenCalledTimes(1);
        });
    });
});
