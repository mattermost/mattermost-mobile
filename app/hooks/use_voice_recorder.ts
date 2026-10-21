// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AudioModule, AudioQuality, IOSOutputFormat, setAudioModeAsync, type AudioRecorder, type RecordingOptions, type RecordingOptionsAndroid, type RecordingOptionsIos, type RecordingOptionsWeb} from 'expo-audio';
import {File} from 'expo-file-system';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';

import {getFullErrorMessage} from '@utils/errors';
import {pathWithPrefix} from '@utils/file';
import {
    getVoiceNoteFileName,
    VOICE_NOTE_BIT_RATE,
    VOICE_NOTE_CHANNELS,
    VOICE_NOTE_EXTENSION,
    VOICE_NOTE_MAX_DURATION_MS,
    VOICE_NOTE_MIME_TYPE,
    VOICE_NOTE_SAMPLE_RATE,
} from '@utils/file/voice_note';
import {generateId, hapticFeedback} from '@utils/general';
import {logDebug, logError} from '@utils/log';

const TIMER_TICK_MS = 250;

export const VOICE_NOTE_RECORDING_OPTIONS: RecordingOptions = {
    extension: `.${VOICE_NOTE_EXTENSION}`,
    sampleRate: VOICE_NOTE_SAMPLE_RATE,
    numberOfChannels: VOICE_NOTE_CHANNELS,
    bitRate: VOICE_NOTE_BIT_RATE,
    android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
    },
    ios: {
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.HIGH,
    },
    web: {
        mimeType: VOICE_NOTE_MIME_TYPE,
        bitsPerSecond: VOICE_NOTE_BIT_RATE,
    },
};

export type VoiceRecorderOptions = {
    maxDurationMs?: number;
    onFinish: (file: ExtractedFileInfo, maxDurationReached: boolean) => void;
    onError: (error: unknown) => void;
};

const createRecorder = () => {
    const {android, ios, web, ...common} = VOICE_NOTE_RECORDING_OPTIONS;
    const platformOptions = Platform.select<RecordingOptionsIos | RecordingOptionsAndroid | RecordingOptionsWeb>({ios, android, default: web});
    return new AudioModule.AudioRecorder({...common, ...platformOptions});
};

const deleteRecording = (uri: string | null) => {
    if (!uri) {
        return;
    }

    try {
        const file = new File(uri);
        if (file.exists) {
            file.delete();
        }
    } catch (error) {
        logDebug('useVoiceRecorder.deleteRecording failed', getFullErrorMessage(error));
    }
};

const resetAudioMode = async () => {
    try {
        await setAudioModeAsync({allowsRecording: false});
    } catch (error) {
        logDebug('useVoiceRecorder.resetAudioMode failed', getFullErrorMessage(error));
    }
};

/**
 * Records a voice note with expo-audio. The native recorder only exists while a
 * recording is in progress; `stop` resolves the recording into an `ExtractedFileInfo`
 * ready to be handed to the draft upload flow and `cancel` discards the temp file.
 * Recording is automatically stopped once `maxDurationMs` is reached.
 */
export const useVoiceRecorder = ({maxDurationMs = VOICE_NOTE_MAX_DURATION_MS, onFinish, onError}: VoiceRecorderOptions) => {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);

    const recorderRef = useRef<AudioRecorder>(null);
    const startedAtRef = useRef(0);
    const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);
    const maxDurationRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const onFinishRef = useRef(onFinish);
    const onErrorRef = useRef(onError);
    onFinishRef.current = onFinish;
    onErrorRef.current = onError;

    const clearTimers = useCallback(() => {
        clearInterval(tickRef.current);
        clearTimeout(maxDurationRef.current);
        tickRef.current = undefined;
        maxDurationRef.current = undefined;
    }, []);

    const releaseRecorder = useCallback(() => {
        recorderRef.current?.release();
        recorderRef.current = null;
    }, []);

    const stop = useCallback(async (maxDurationReached = false) => {
        const recorder = recorderRef.current;
        if (!recorder) {
            logDebug('useVoiceRecorder.stop called while not recording');
            return;
        }

        clearTimers();
        setIsRecording(false);
        const durationMs = Date.now() - startedAtRef.current;

        try {
            await recorder.stop();
            const uri = recorder.uri;
            if (!uri) {
                throw new Error('recorder did not produce a file');
            }

            const name = getVoiceNoteFileName(new Date(startedAtRef.current), durationMs);
            const file = new File(pathWithPrefix('file://', uri));

            // The upload takes its file name from the local path, so give the recorder's
            // temporary file (recording-<uuid>.m4a) the voice note name first.
            try {
                file.rename(name);
            } catch (error) {
                logDebug('useVoiceRecorder.stop could not rename the recording', getFullErrorMessage(error));
            }

            const fileInfo: ExtractedFileInfo = {
                clientId: generateId(),
                name,
                mime_type: VOICE_NOTE_MIME_TYPE,
                extension: VOICE_NOTE_EXTENSION,
                size: file.size ?? 0,
                localPath: pathWithPrefix('file://', file.uri),
            };

            hapticFeedback();
            onFinishRef.current(fileInfo, maxDurationReached);
        } catch (error) {
            logError('useVoiceRecorder.stop', getFullErrorMessage(error));
            deleteRecording(recorder.uri);
            onErrorRef.current(error);
        } finally {
            releaseRecorder();
            await resetAudioMode();
        }
    }, [clearTimers, releaseRecorder]);

    const cancel = useCallback(async () => {
        const recorder = recorderRef.current;
        if (!recorder) {
            logDebug('useVoiceRecorder.cancel called while not recording');
            return;
        }

        clearTimers();
        setIsRecording(false);

        try {
            await recorder.stop();
        } catch (error) {
            logDebug('useVoiceRecorder.cancel failed to stop recorder', getFullErrorMessage(error));
        } finally {
            deleteRecording(recorder.uri);
            releaseRecorder();
            await resetAudioMode();
        }
    }, [clearTimers, releaseRecorder]);

    const start = useCallback(async () => {
        if (recorderRef.current) {
            logDebug('useVoiceRecorder.start called while already recording');
            return;
        }

        const recorder = createRecorder();
        recorderRef.current = recorder;

        try {
            await setAudioModeAsync({allowsRecording: true, playsInSilentMode: true});
            await recorder.prepareToRecordAsync();
            recorder.record();

            startedAtRef.current = Date.now();
            setElapsedMs(0);
            setIsRecording(true);
            hapticFeedback();

            tickRef.current = setInterval(() => {
                setElapsedMs(Date.now() - startedAtRef.current);
            }, TIMER_TICK_MS);
            maxDurationRef.current = setTimeout(() => {
                stop(true);
            }, maxDurationMs);
        } catch (error) {
            logError('useVoiceRecorder.start', getFullErrorMessage(error));
            clearTimers();
            setIsRecording(false);
            releaseRecorder();
            await resetAudioMode();
            onErrorRef.current(error);
        }
    }, [clearTimers, maxDurationMs, releaseRecorder, stop]);

    // Discard any in-progress recording if the owner unmounts mid-way (e.g. the user
    // navigates away from the channel), so no orphaned temp files or recorders remain.
    useEffect(() => {
        return () => {
            clearTimers();
            const recorder = recorderRef.current;
            if (!recorder) {
                return;
            }
            recorderRef.current = null;
            recorder.stop().
                catch((error) => logDebug('useVoiceRecorder.unmount failed to stop recorder', getFullErrorMessage(error))).
                finally(() => {
                    deleteRecording(recorder.uri);
                    recorder.release();
                    resetAudioMode();
                });
        };
    }, [clearTimers]);

    return {
        isRecording,
        elapsedMs,
        start,
        stop,
        cancel,
    };
};
