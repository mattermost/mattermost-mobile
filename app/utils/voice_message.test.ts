// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {File} from 'expo-file-system';

import {createVoiceMessageFile, VOICE_MESSAGE_MIME_TYPE} from './voice_message';

jest.mock('expo-file-system', () => ({
    File: jest.fn(),
}));

describe('createVoiceMessageFile', () => {
    const info = jest.fn();

    beforeEach(() => {
        jest.mocked(File).mockImplementation(() => ({info}) as unknown as File);
        info.mockReturnValue({exists: true, size: 4096});
    });

    it('creates a draft-compatible audio attachment with real file metadata', () => {
        const file = createVoiceMessageFile('file:///cache/Audio/recording.m4a', 12345);

        expect(File).toHaveBeenCalledWith('file:///cache/Audio/recording.m4a');
        expect(file).toEqual(expect.objectContaining({
            loading: true,
            localPath: 'file:///cache/Audio/recording.m4a',
            mime_type: VOICE_MESSAGE_MIME_TYPE,
            name: 'voice-message-12345.m4a',
            progress: 0,
            size: 4096,
        }));
        expect(file.clientId).toBeDefined();
    });

    it.each([{exists: false, size: 4096}, {exists: true, size: 0}])('rejects unavailable or empty recordings: %p', (fileInfo) => {
        info.mockReturnValue(fileInfo);

        expect(() => createVoiceMessageFile('file:///cache/Audio/recording.m4a')).toThrow('The voice recording is empty or unavailable');
    });
});
