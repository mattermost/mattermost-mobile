// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {PermissionStatus, requestRecordingPermissionsAsync, type RecordingStatus} from 'expo-audio';
import React from 'react';
import {Alert} from 'react-native';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {deleteFile} from '@utils/file';
import {createVoiceMessageFile} from '@utils/voice_message';

import VoiceRecordAction from './voice_record_action';

let mockStatusListener: ((status: RecordingStatus) => void) | undefined;
const mockRecorder = {
    getStatus: jest.fn(),
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(),
    uri: 'file:///cache/Audio/recording.m4a',
};

jest.mock('expo-audio', () => ({
    RecordingPresets: {
        HIGH_QUALITY: {
            extension: '.m4a',
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            android: {outputFormat: 'mpeg4', audioEncoder: 'aac'},
            ios: {audioQuality: 127},
            web: {mimeType: 'audio/webm', bitsPerSecond: 128000},
        },
    },
    PermissionStatus: {GRANTED: 'granted', DENIED: 'denied'},
    requestRecordingPermissionsAsync: jest.fn(),
    useAudioRecorder: jest.fn((_options, listener) => {
        mockStatusListener = listener;
        return mockRecorder;
    }),
}));

jest.mock('@context/keyboard_state', () => ({
    useKeyboardState: () => ({blurAndDismissKeyboard: jest.fn().mockResolvedValue(undefined)}),
}));

jest.mock('@utils/file', () => ({
    deleteFile: jest.fn(),
}));

jest.mock('@utils/voice_message', () => ({
    createVoiceMessageFile: jest.fn(),
}));

const uploadedFile = {
    clientId: 'clientid1',
    localPath: 'file:///cache/Audio/recording.m4a',
    mime_type: 'audio/mp4',
    name: 'voice-message-12345.m4a',
    size: 4096,
};

function emitFinished(hasError = false) {
    mockStatusListener?.({
        id: 'recorderid1',
        isFinished: true,
        hasError,
        error: hasError ? 'Recorder failed' : null,
        url: hasError ? null : mockRecorder.uri,
    });
}

describe('VoiceRecordAction', () => {
    beforeEach(() => {
        Alert.alert = jest.fn();
        mockStatusListener = undefined;
        mockRecorder.getStatus.mockReturnValue({durationMillis: 1250});
        mockRecorder.prepareToRecordAsync.mockResolvedValue(undefined);
        mockRecorder.stop.mockImplementation(async () => emitFinished());
        jest.mocked(requestRecordingPermissionsAsync).mockResolvedValue({
            granted: true,
            status: PermissionStatus.GRANTED,
            canAskAgain: true,
            expires: 'never',
        });
        jest.mocked(createVoiceMessageFile).mockReturnValue(uploadedFile);
    });

    function renderAction(overrides: Partial<Parameters<typeof VoiceRecordAction>[0]> = {}) {
        return renderWithIntlAndTheme(
            <VoiceRecordAction
                disabled={false}
                onUploadFiles={jest.fn()}
                testID='voice-record'
                {...overrides}
            />,
        );
    }

    it('does not request permission or record when uploads are disabled', () => {
        renderAction({disabled: true});

        fireEvent.press(screen.getByTestId('voice-record.disabled'));

        expect(requestRecordingPermissionsAsync).not.toHaveBeenCalled();
        expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('explains how to enable microphone access after permission is denied', async () => {
        jest.mocked(requestRecordingPermissionsAsync).mockResolvedValue({
            granted: false,
            status: PermissionStatus.DENIED,
            canAskAgain: false,
            expires: 'never',
        });
        renderAction();

        fireEvent.press(screen.getByTestId('voice-record'));

        await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
            'Microphone access needed',
            'Allow microphone access in Settings to record a voice message.',
            expect.any(Array),
        ));
        expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
        expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('stops a confirmed recording and attaches it to the existing draft upload flow', async () => {
        const onUploadFiles = jest.fn();
        renderAction({onUploadFiles});

        fireEvent.press(screen.getByTestId('voice-record'));
        await waitFor(() => expect(mockRecorder.record).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByTestId('voice-record.attach')).not.toBeDisabled());

        expect(screen.getByTestId('voice-record.timer')).toHaveTextContent('00:01');
        fireEvent.press(screen.getByTestId('voice-record.attach'));

        await waitFor(() => {
            expect(mockRecorder.stop).toHaveBeenCalled();
            expect(createVoiceMessageFile).toHaveBeenCalledWith(mockRecorder.uri);
            expect(onUploadFiles).toHaveBeenCalledWith([uploadedFile]);
        });
        expect(deleteFile).not.toHaveBeenCalled();
    });

    it('cancels without attaching and removes the temporary recording', async () => {
        const onUploadFiles = jest.fn();
        renderAction({onUploadFiles});

        fireEvent.press(screen.getByTestId('voice-record'));
        await waitFor(() => expect(mockRecorder.record).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByTestId('voice-record.cancel')).not.toBeDisabled());
        fireEvent.press(screen.getByTestId('voice-record.cancel'));

        await waitFor(() => expect(deleteFile).toHaveBeenCalledWith(mockRecorder.uri));
        expect(onUploadFiles).not.toHaveBeenCalled();
        expect(createVoiceMessageFile).not.toHaveBeenCalled();
    });

    it('does not attach a file when the native recorder reports a stop failure', async () => {
        const onUploadFiles = jest.fn();
        mockRecorder.stop.mockImplementation(async () => emitFinished(true));
        renderAction({onUploadFiles});

        fireEvent.press(screen.getByTestId('voice-record'));
        await waitFor(() => expect(mockRecorder.record).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByTestId('voice-record.attach')).not.toBeDisabled());
        fireEvent.press(screen.getByTestId('voice-record.attach'));

        await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
            'Unable to record voice message',
            'The recording could not be created. Check microphone access and try again.',
        ));
        expect(onUploadFiles).not.toHaveBeenCalled();
        expect(createVoiceMessageFile).not.toHaveBeenCalled();
        expect(deleteFile).toHaveBeenCalledWith(mockRecorder.uri);
    });
});
