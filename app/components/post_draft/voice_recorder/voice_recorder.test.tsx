// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import {AudioModule} from 'expo-audio';
import {File} from 'expo-file-system';
import {useIsFocused} from 'expo-router';
import {AccessibilityInfo} from 'react-native';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import VoiceRecorder from './voice_recorder';

describe('VoiceRecorder', () => {
    const MockAudioRecorder = AudioModule.AudioRecorder as unknown as jest.Mock;
    const baseProps = {
        testID: 'voice_recorder',
        onFinish: jest.fn(),
        onCancel: jest.fn(),
        onError: jest.fn(),
    };

    const renderRecorder = async () => {
        jest.mocked(useIsFocused).mockReturnValue(true);
        const result = renderWithIntlAndTheme(<VoiceRecorder {...baseProps}/>);

        // Let the recording started on mount get going.
        await act(async () => {
            await advanceTimers(0);
        });
        return result;
    };

    beforeEach(() => {
        enableFakeTimers();
        jest.setSystemTime(new Date(2026, 9, 20, 14, 35, 1));
    });

    afterEach(() => {
        disableFakeTimers();
    });

    it('should start recording on mount and show the elapsed time against the limit', async () => {
        const {getByTestId, getByText, getByLabelText} = await renderRecorder();

        expect(MockAudioRecorder).toHaveBeenCalledTimes(1);
        expect(MockAudioRecorder.mock.results[0].value.record).toHaveBeenCalledTimes(1);
        expect(getByTestId('voice_recorder.timer')).toHaveTextContent('0:00');
        expect(getByText('/ 5:00')).toBeVisible();

        await act(async () => {
            await advanceTimers(5000);
        });

        expect(getByTestId('voice_recorder.timer')).toHaveTextContent('0:05');
        expect(getByLabelText('Recording voice note, 0:05')).toBeVisible();
    });

    it('should hand the recorded voice note to the parent when done is pressed', async () => {
        const {getByTestId} = await renderRecorder();
        await act(async () => {
            await advanceTimers(7000);
        });

        await act(async () => {
            fireEvent.press(getByTestId('voice_recorder.done'));
            await advanceTimers(0);
        });

        expect(baseProps.onFinish).toHaveBeenCalledTimes(1);
        expect(baseProps.onFinish).toHaveBeenCalledWith(expect.objectContaining({
            name: 'voice-note-20261020-143501-0m07s.m4a',
            mime_type: 'audio/mp4',
            extension: 'm4a',
            localPath: 'file:///mock/voice-note-20261020-143501-0m07s.m4a',
        }), false);
        expect(baseProps.onCancel).not.toHaveBeenCalled();
        expect(baseProps.onError).not.toHaveBeenCalled();
    });

    it('should discard the recording and notify the parent when cancel is pressed', async () => {
        const {getByTestId} = await renderRecorder();

        await act(async () => {
            fireEvent.press(getByTestId('voice_recorder.cancel'));
            await advanceTimers(0);
        });

        expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
        expect(baseProps.onFinish).not.toHaveBeenCalled();
        const files = jest.mocked(File).mock.results;
        expect(jest.mocked(File)).toHaveBeenLastCalledWith('file:///mock/recording.m4a');
        expect(files[files.length - 1].value.delete).toHaveBeenCalledTimes(1);
    });

    it('should report an error to the parent when recording cannot start', async () => {
        MockAudioRecorder.mockImplementationOnce(() => ({
            uri: null,
            prepareToRecordAsync: jest.fn(() => Promise.reject(new Error('mic busy'))),
            record: jest.fn(),
            stop: jest.fn(() => Promise.resolve()),
            release: jest.fn(),
        }));

        await renderRecorder();

        expect(baseProps.onError).toHaveBeenCalledTimes(1);
        expect(baseProps.onFinish).not.toHaveBeenCalled();
    });

    it('should announce the start and the end of the recording once to screen readers', async () => {
        const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
        const {getByTestId} = await renderRecorder();

        expect(announce).toHaveBeenCalledTimes(1);
        expect(announce).toHaveBeenLastCalledWith('Recording voice note');

        // The per-second timer is not announced.
        await act(async () => {
            await advanceTimers(5000);
        });
        expect(announce).toHaveBeenCalledTimes(1);

        await act(async () => {
            fireEvent.press(getByTestId('voice_recorder.done'));
            await advanceTimers(0);
        });
        expect(announce).toHaveBeenCalledTimes(2);
        expect(announce).toHaveBeenLastCalledWith('Voice note attached');
    });

    it('should stop and attach the recording when another screen covers the composer', async () => {
        const {rerender} = await renderRecorder();
        await act(async () => {
            await advanceTimers(3000);
        });

        jest.mocked(useIsFocused).mockReturnValue(false);
        await act(async () => {
            rerender(<VoiceRecorder {...baseProps}/>);
            await advanceTimers(0);
        });

        expect(MockAudioRecorder.mock.results[0].value.stop).toHaveBeenCalledTimes(1);
        expect(baseProps.onFinish).toHaveBeenCalledTimes(1);
        expect(baseProps.onFinish.mock.calls[0][0].name).toBe('voice-note-20261020-143501-0m03s.m4a');
    });

    it('should treat a recording shorter than a second as cancelled', async () => {
        const {getByTestId} = await renderRecorder();

        await act(async () => {
            fireEvent.press(getByTestId('voice_recorder.done'));
            await advanceTimers(0);
        });

        expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
        expect(baseProps.onFinish).not.toHaveBeenCalled();
        expect(jest.mocked(File).mock.results[jest.mocked(File).mock.results.length - 1].value.delete).toHaveBeenCalledTimes(1);
    });
});
