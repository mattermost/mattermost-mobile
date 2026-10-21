// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import {AudioModule, setAudioModeAsync} from 'expo-audio';
import {File} from 'expo-file-system';

import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import {VOICE_NOTE_MAX_DURATION_MS} from '@utils/file/voice_note';
import {hapticFeedback} from '@utils/general';

import {useVoiceRecorder, VOICE_NOTE_RECORDING_OPTIONS} from './use_voice_recorder';

jest.mock('@utils/general', () => ({
    ...jest.requireActual('@utils/general'),
    hapticFeedback: jest.fn(),
}));

type MockRecorder = {
    uri: string | null;
    prepareToRecordAsync: jest.Mock;
    record: jest.Mock;
    stop: jest.Mock;
    release: jest.Mock;
};

describe('useVoiceRecorder', () => {
    const onFinish = jest.fn();
    const onError = jest.fn();
    const MockAudioRecorder = AudioModule.AudioRecorder as unknown as jest.Mock;

    const getRecorder = (): MockRecorder => MockAudioRecorder.mock.results[0].value;
    const lastFile = () => {
        const files = jest.mocked(File).mock.results;
        return files[files.length - 1].value;
    };

    const renderRecorder = (maxDurationMs?: number) => {
        return renderHook(() => useVoiceRecorder({maxDurationMs, onFinish, onError}));
    };

    beforeEach(() => {
        enableFakeTimers();
        jest.setSystemTime(new Date(2026, 9, 20, 14, 35, 1));
    });

    afterEach(() => {
        disableFakeTimers();
    });

    it('should start recording with the platform recording options and report elapsed time', async () => {
        const {result} = renderRecorder();

        expect(result.current.isRecording).toBe(false);
        expect(MockAudioRecorder).not.toHaveBeenCalled();

        await act(async () => {
            await result.current.start();
        });

        const {android, ios, web, ...common} = VOICE_NOTE_RECORDING_OPTIONS;
        expect(MockAudioRecorder).toHaveBeenCalledTimes(1);
        expect(MockAudioRecorder).toHaveBeenCalledWith({...common, ...ios});
        expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({allowsRecording: true}));
        expect(getRecorder().record).toHaveBeenCalledTimes(1);
        expect(result.current.isRecording).toBe(true);
        expect(result.current.elapsedMs).toBe(0);

        await act(async () => {
            await advanceTimers(1000);
        });
        expect(result.current.elapsedMs).toBe(1000);

        await act(async () => {
            await advanceTimers(2500);
        });
        expect(result.current.elapsedMs).toBe(3500);
    });

    it('should ignore a second start while already recording', async () => {
        const {result} = renderRecorder();

        await act(async () => {
            await result.current.start();
            await result.current.start();
        });

        expect(MockAudioRecorder).toHaveBeenCalledTimes(1);
        expect(getRecorder().record).toHaveBeenCalledTimes(1);
    });

    it('should resolve the recording into an audio/mp4 m4a file on stop', async () => {
        const {result} = renderRecorder();
        await act(async () => {
            await result.current.start();
        });

        // The size reported for the attachment is the size of the recorded file on disk.
        const MockFile = jest.mocked(File);
        MockFile.mockImplementationOnce((uri) => {
            const recording = {
                uri: String(uri),
                size: 252000,
                rename: jest.fn((newName: string) => {
                    recording.uri = recording.uri.replace(/[^/]+$/, newName);
                }),
            };
            return recording as unknown as File;
        });

        await act(async () => {
            await advanceTimers(42000);
            await result.current.stop();
        });

        expect(MockFile).toHaveBeenCalledWith('file:///mock/recording.m4a');
        expect(MockFile.mock.results[0].value.rename).toHaveBeenCalledWith('voice-note-20261020-143501-0m42s.m4a');
        expect(getRecorder().stop).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledWith({
            clientId: expect.any(String),
            name: 'voice-note-20261020-143501-0m42s.m4a',
            mime_type: 'audio/mp4',
            extension: 'm4a',
            size: 252000,
            localPath: 'file:///mock/voice-note-20261020-143501-0m42s.m4a',
        }, false);
        expect(onError).not.toHaveBeenCalled();
        expect(getRecorder().release).toHaveBeenCalledTimes(1);
        expect(setAudioModeAsync).toHaveBeenLastCalledWith({allowsRecording: false});
        expect(hapticFeedback).toHaveBeenCalledTimes(2);
        expect(result.current.isRecording).toBe(false);
    });

    it('should automatically stop at the five minute limit and flag it', async () => {
        const {result} = renderRecorder();
        await act(async () => {
            await result.current.start();
        });

        await act(async () => {
            await advanceTimers(VOICE_NOTE_MAX_DURATION_MS - 1);
        });
        expect(getRecorder().stop).not.toHaveBeenCalled();
        expect(result.current.isRecording).toBe(true);

        await act(async () => {
            await advanceTimers(1);
        });

        expect(getRecorder().stop).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(onFinish.mock.calls[0][0].name).toBe('voice-note-20261020-143501-5m00s.m4a');
        expect(onFinish.mock.calls[0][1]).toBe(true);
        expect(result.current.isRecording).toBe(false);

        // The timer no longer ticks once the recording has stopped.
        const elapsedAtStop = result.current.elapsedMs;
        await act(async () => {
            await advanceTimers(5000);
        });
        expect(result.current.elapsedMs).toBe(elapsedAtStop);
        expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('should discard the temp file on cancel without finishing', async () => {
        const {result} = renderRecorder();
        await act(async () => {
            await result.current.start();
        });

        await act(async () => {
            await result.current.cancel();
        });

        const recorder = getRecorder();
        expect(recorder.stop).toHaveBeenCalledTimes(1);
        expect(recorder.release).toHaveBeenCalledTimes(1);
        expect(jest.mocked(File)).toHaveBeenLastCalledWith('file:///mock/recording.m4a');
        expect(lastFile().delete).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(result.current.isRecording).toBe(false);

        await act(async () => {
            await advanceTimers(5000);
        });
        expect(onFinish).not.toHaveBeenCalled();
    });

    it('should report an error and release the recorder when recording fails to start', async () => {
        MockAudioRecorder.mockImplementationOnce(() => ({
            uri: null,
            prepareToRecordAsync: jest.fn(() => Promise.reject(new Error('mic busy'))),
            record: jest.fn(),
            stop: jest.fn(() => Promise.resolve()),
            release: jest.fn(),
        }));
        const {result} = renderRecorder();

        await act(async () => {
            await result.current.start();
        });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(getRecorder().release).toHaveBeenCalledTimes(1);
        expect(result.current.isRecording).toBe(false);
    });

    it('should report an error and discard the temp file when stopping fails', async () => {
        const {result} = renderRecorder();
        await act(async () => {
            await result.current.start();
        });
        const recorder = getRecorder();
        recorder.stop.mockRejectedValueOnce(new Error('stop failed'));

        await act(async () => {
            await result.current.stop();
        });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(jest.mocked(File)).toHaveBeenLastCalledWith('file:///mock/recording.m4a');
        expect(lastFile().delete).toHaveBeenCalledTimes(1);
        expect(recorder.release).toHaveBeenCalledTimes(1);
        expect(setAudioModeAsync).toHaveBeenLastCalledWith({allowsRecording: false});
        expect(result.current.isRecording).toBe(false);
    });

    it('should report an error when the recorder produces no file', async () => {
        MockAudioRecorder.mockImplementationOnce(() => ({
            uri: null,
            prepareToRecordAsync: jest.fn(() => Promise.resolve()),
            record: jest.fn(),
            stop: jest.fn(() => Promise.resolve()),
            release: jest.fn(),
        }));
        const {result} = renderRecorder();
        await act(async () => {
            await result.current.start();
        });

        await act(async () => {
            await result.current.stop();
        });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(getRecorder().release).toHaveBeenCalledTimes(1);
    });

    it('should stop and discard an in-progress recording on unmount', async () => {
        const {result, unmount} = renderRecorder();
        await act(async () => {
            await result.current.start();
        });

        unmount();
        await advanceTimers(0);

        const recorder = getRecorder();
        expect(recorder.stop).toHaveBeenCalledTimes(1);
        expect(recorder.release).toHaveBeenCalledTimes(1);
        expect(lastFile().delete).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
    });

    it('should ignore stop and cancel when not recording', async () => {
        const {result} = renderRecorder();

        await act(async () => {
            await result.current.stop();
            await result.current.cancel();
        });

        expect(MockAudioRecorder).not.toHaveBeenCalled();
        expect(onFinish).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });
});
