// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import {AudioModule, setAudioModeAsync, setIsAudioActiveAsync, type RecordingStatus} from 'expo-audio';
import {File} from 'expo-file-system';
import {AppState, Platform, type AppStateStatus} from 'react-native';

import {setCurrentCall} from '@calls/state';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import {VOICE_NOTE_MAX_DURATION_MS} from '@utils/file/voice_note';
import {hapticFeedback} from '@utils/general';

import {useVoiceRecorder, VOICE_NOTE_RECORDING_OPTIONS} from './use_voice_recorder';

import type {CurrentCall} from '@calls/types/calls';

jest.mock('@utils/general', () => ({
    ...jest.requireActual('@utils/general'),
    hapticFeedback: jest.fn(),
}));

type MockRecorder = {
    uri: string | null;
    prepareToRecordAsync: jest.Mock;
    record: jest.Mock;
    pause: jest.Mock;
    stop: jest.Mock;
    release: jest.Mock;
    getStatus: jest.Mock;
    addListener: jest.Mock;
};

describe('useVoiceRecorder', () => {
    const onFinish = jest.fn();
    const onDiscard = jest.fn();
    const onError = jest.fn();
    const MockAudioRecorder = AudioModule.AudioRecorder as unknown as jest.Mock;

    const getRecorder = (index = 0): MockRecorder => MockAudioRecorder.mock.results[index].value;
    const lastFile = () => {
        const files = jest.mocked(File).mock.results;
        return files[files.length - 1].value;
    };

    // The next recorder behaves like the central expo-audio mock except for the given methods.
    const mockNextRecorder = (overrides: Partial<MockRecorder>) => {
        const createDefault = MockAudioRecorder.getMockImplementation() as () => MockRecorder;
        MockAudioRecorder.mockImplementationOnce(() => Object.assign(createDefault(), overrides));
    };

    // Holds prepareToRecordAsync until the returned resolver is called.
    const mockPendingPrepare = () => {
        let resolvePrepare: () => void = () => undefined;
        mockNextRecorder({
            prepareToRecordAsync: jest.fn(() => new Promise<void>((resolve) => {
                resolvePrepare = resolve;
            })),
        });
        return () => resolvePrepare();
    };

    const renderRecorder = (maxDurationMs?: number) => {
        return renderHook(() => useVoiceRecorder({maxDurationMs, onFinish, onDiscard, onError}));
    };

    // Lets the chained stop/release/audio session promises settle.
    const flushPromises = async () => {
        for (let i = 0; i < 5; i++) {
            // eslint-disable-next-line no-await-in-loop
            await advanceTimers(0);
        }
    };

    const startRecording = async (maxDurationMs?: number) => {
        const hook = renderRecorder(maxDurationMs);
        await act(async () => {
            await hook.result.current.start();
        });
        return hook;
    };

    beforeEach(() => {
        enableFakeTimers();
        jest.setSystemTime(new Date(2026, 9, 20, 14, 35, 1));
    });

    afterEach(async () => {
        setCurrentCall(null);
        disableFakeTimers();
    });

    it('should start recording with the iOS recording options and report the recorded time', async () => {
        const {result} = renderRecorder();

        expect(result.current.isRecording).toBe(false);
        expect(MockAudioRecorder).not.toHaveBeenCalled();

        await act(async () => {
            await result.current.start();
        });

        const {android, ios, web, ...common} = VOICE_NOTE_RECORDING_OPTIONS;
        expect(MockAudioRecorder).toHaveBeenCalledTimes(1);
        expect(MockAudioRecorder).toHaveBeenCalledWith({...common, ...ios});
        expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({allowsRecording: true, playsInSilentMode: true}));
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
        expect(result.current.elapsedMs).toBe(3000);
    });

    it('should record with the Android recording options on Android', async () => {
        const select = jest.spyOn(Platform, 'select').mockImplementation(((spec: Record<string, unknown>) => spec.android ?? spec.default) as typeof Platform.select);

        try {
            await startRecording();
        } finally {
            select.mockRestore();
        }

        const {android, ios, web, ...common} = VOICE_NOTE_RECORDING_OPTIONS;
        expect(MockAudioRecorder).toHaveBeenCalledTimes(1);
        expect(MockAudioRecorder).toHaveBeenCalledWith({...common, ...android});
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

    it('should resolve the recording into an audio/mp4 m4a file on stop and release the audio session', async () => {
        const {result} = await startRecording();

        // The size reported for the attachment is the size of the recorded file on disk.
        const MockFile = jest.mocked(File);
        const createDefaultFile = MockFile.getMockImplementation() as (uri: string) => File;
        MockFile.mockImplementationOnce((uri) => Object.assign(createDefaultFile(String(uri)), {size: 252000}));

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

        // The idle mode is spelled out in full so nothing falls back to its default.
        expect(setAudioModeAsync).toHaveBeenLastCalledWith({
            allowsRecording: false,
            playsInSilentMode: true,
            interruptionMode: 'mixWithOthers',
            shouldPlayInBackground: false,
            shouldRouteThroughEarpiece: false,
            allowsBackgroundRecording: false,
        });
        expect(setIsAudioActiveAsync).toHaveBeenCalledWith(false);
        expect(hapticFeedback).toHaveBeenCalledTimes(2);
        expect(result.current.isRecording).toBe(false);
    });

    it('should only stop the native recorder once when stop is called twice', async () => {
        const {result} = await startRecording();
        await act(async () => {
            await advanceTimers(3000);
        });

        await act(async () => {
            await Promise.all([result.current.stop(), result.current.stop()]);
        });

        expect(getRecorder().stop).toHaveBeenCalledTimes(1);
        expect(getRecorder().release).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('should discard a recording shorter than a second instead of finishing', async () => {
        const {result} = await startRecording();
        await act(async () => {
            await advanceTimers(500);
            await result.current.stop();
        });

        expect(onDiscard).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
        expect(jest.mocked(File)).toHaveBeenLastCalledWith('file:///mock/recording.m4a');
        expect(lastFile().delete).toHaveBeenCalledTimes(1);
        expect(getRecorder().release).toHaveBeenCalledTimes(1);
    });

    it('should automatically stop at the five minute limit of recorded audio and flag it', async () => {
        const {result} = await startRecording();

        await act(async () => {
            await advanceTimers(VOICE_NOTE_MAX_DURATION_MS - 250);
        });
        expect(getRecorder().stop).not.toHaveBeenCalled();
        expect(result.current.isRecording).toBe(true);

        await act(async () => {
            await advanceTimers(250);
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

    it('should stop and keep the recording when the system pauses the recorder', async () => {
        const {result} = await startRecording();
        await act(async () => {
            await advanceTimers(10000);
        });

        // e.g. an incoming phone call; the recorder is never resumed afterwards.
        getRecorder().pause();
        await act(async () => {
            await advanceTimers(20000);
        });

        expect(getRecorder().stop).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);

        // The name carries the audio actually captured, not the wall-clock time.
        expect(onFinish.mock.calls[0][0].name).toBe('voice-note-20261020-143501-0m10s.m4a');
        expect(onFinish.mock.calls[0][1]).toBe(false);
        expect(result.current.isRecording).toBe(false);
    });

    it('should stop and keep the recording when the app goes to the background', async () => {
        const addAppStateListener = jest.mocked(AppState.addEventListener);
        await startRecording();
        await act(async () => {
            await advanceTimers(4000);
        });

        expect(addAppStateListener).toHaveBeenCalledTimes(1);
        const handler = addAppStateListener.mock.calls[0][1] as (state: AppStateStatus) => void;

        // Control center or a system alert only makes the app inactive.
        await act(async () => {
            handler('inactive');
            await advanceTimers(0);
        });
        expect(getRecorder().stop).not.toHaveBeenCalled();

        await act(async () => {
            handler('background');
            await flushPromises();
        });
        expect(getRecorder().stop).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(onFinish.mock.calls[0][0].name).toBe('voice-note-20261020-143501-0m04s.m4a');
    });

    it('should report an error and discard the file when the recorder fails mid-way', async () => {
        await startRecording();
        const recorder = getRecorder();
        expect(recorder.addListener).toHaveBeenCalledWith('recordingStatusUpdate', expect.any(Function));
        const listener = recorder.addListener.mock.calls[0][1] as (status: RecordingStatus) => void;

        await act(async () => {
            listener({id: '1', isFinished: true, hasError: true, error: 'encoder failed', url: null});
            await flushPromises();
        });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(lastFile().delete).toHaveBeenCalledTimes(1);
        expect(recorder.release).toHaveBeenCalledTimes(1);
    });

    it('should stop and keep the recording without resetting the audio session when a call starts', async () => {
        const {result} = await startRecording();
        await act(async () => {
            await advanceTimers(6000);
        });
        jest.mocked(setAudioModeAsync).mockClear();

        await act(async () => {
            setCurrentCall({channelId: 'channel-id'} as CurrentCall);
            await flushPromises();
        });

        expect(getRecorder().stop).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(result.current.isRecording).toBe(false);

        // The call owns the audio session now.
        expect(setAudioModeAsync).not.toHaveBeenCalled();
        expect(setIsAudioActiveAsync).not.toHaveBeenCalled();
    });

    it('should refuse to start while a call is active', async () => {
        setCurrentCall({channelId: 'channel-id'} as CurrentCall);

        await startRecording();

        expect(MockAudioRecorder).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should only let one composer record at a time', async () => {
        const first = await startRecording();
        await act(async () => {
            await advanceTimers(2000);
        });

        // e.g. the thread composer while the channel one is still recording.
        const secondOnError = jest.fn();
        const second = renderHook(() => useVoiceRecorder({onFinish, onDiscard, onError: secondOnError}));
        await act(async () => {
            await second.result.current.start();
        });

        expect(MockAudioRecorder).toHaveBeenCalledTimes(1);
        expect(secondOnError).toHaveBeenCalledTimes(1);
        expect(second.result.current.isRecording).toBe(false);
        expect(first.result.current.isRecording).toBe(true);

        await act(async () => {
            await first.result.current.stop();
        });
        await act(async () => {
            await second.result.current.start();
        });

        expect(MockAudioRecorder).toHaveBeenCalledTimes(2);
        expect(second.result.current.isRecording).toBe(true);
    });

    it('should clean up without recording when cancelled while start is pending', async () => {
        const resolvePrepare = mockPendingPrepare();
        const {result} = renderRecorder();

        let starting: Promise<void> = Promise.resolve();
        await act(async () => {
            starting = result.current.start();
            await advanceTimers(0);
        });
        await act(async () => {
            await result.current.cancel();
        });
        await act(async () => {
            resolvePrepare();
            await starting;
        });

        const recorder = getRecorder();
        expect(recorder.record).not.toHaveBeenCalled();
        expect(recorder.stop).not.toHaveBeenCalled();
        expect(recorder.release).toHaveBeenCalledTimes(1);
        expect(lastFile().delete).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
        expect(result.current.isRecording).toBe(false);

        // No timer was left polling the released recorder.
        await advanceTimers(1000);
        expect(recorder.getStatus).not.toHaveBeenCalled();
    });

    it('should clean up without recording when unmounted while start is pending', async () => {
        const resolvePrepare = mockPendingPrepare();
        const {result, unmount} = renderRecorder();

        let starting: Promise<void> = Promise.resolve();
        await act(async () => {
            starting = result.current.start();
            await advanceTimers(0);
        });
        unmount();
        resolvePrepare();
        await starting;

        const recorder = getRecorder();
        expect(recorder.record).not.toHaveBeenCalled();
        expect(recorder.release).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
        await advanceTimers(1000);
        expect(recorder.getStatus).not.toHaveBeenCalled();
    });

    it('should discard the temp file on cancel without finishing', async () => {
        const {result} = await startRecording();

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
        mockNextRecorder({
            uri: null,
            prepareToRecordAsync: jest.fn(() => Promise.reject(new Error('mic busy'))),
        });
        const {result} = await startRecording();

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(getRecorder().release).toHaveBeenCalledTimes(1);
        expect(result.current.isRecording).toBe(false);
    });

    it('should report an error and discard the temp file when stopping fails', async () => {
        const {result} = await startRecording();
        const recorder = getRecorder();
        recorder.stop.mockRejectedValueOnce(new Error('stop failed'));

        await act(async () => {
            await advanceTimers(2000);
            await result.current.stop();
        });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(jest.mocked(File)).toHaveBeenLastCalledWith('file:///mock/recording.m4a');
        expect(lastFile().delete).toHaveBeenCalledTimes(1);
        expect(recorder.release).toHaveBeenCalledTimes(1);
        expect(result.current.isRecording).toBe(false);
    });

    it('should report an error when the recorder produces no file', async () => {
        const {result} = await startRecording();
        getRecorder().uri = null;

        await act(async () => {
            await advanceTimers(2000);
            await result.current.stop();
        });

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onFinish).not.toHaveBeenCalled();
        expect(getRecorder().release).toHaveBeenCalledTimes(1);
    });

    it('should stop and discard an in-progress recording on unmount', async () => {
        const {unmount} = await startRecording();

        unmount();
        await flushPromises();

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
