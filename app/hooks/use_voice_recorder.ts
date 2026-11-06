// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    AudioModule,
    AudioQuality,
    IOSOutputFormat,
    setAudioModeAsync,
    setIsAudioActiveAsync,
    type AudioMode,
    type AudioRecorder,
    type RecordingOptions,
    type RecordingOptionsAndroid,
    type RecordingOptionsIos,
    type RecordingOptionsWeb,
    type RecordingStatus,
} from 'expo-audio';
import {File} from 'expo-file-system';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Platform} from 'react-native';

import {getCurrentCall, observeCurrentCall} from '@calls/state';
import {getFullErrorMessage} from '@utils/errors';
import {pathWithPrefix} from '@utils/file';
import {
    deleteVoiceNoteFile,
    getVoiceNoteFileName,
    VOICE_NOTE_BIT_RATE,
    VOICE_NOTE_CHANNELS,
    VOICE_NOTE_EXTENSION,
    VOICE_NOTE_MAX_DURATION_MS,
    VOICE_NOTE_MIME_TYPE,
    VOICE_NOTE_MIN_DURATION_MS,
    VOICE_NOTE_SAMPLE_RATE,
} from '@utils/file/voice_note';
import {generateId, hapticFeedback} from '@utils/general';
import {logDebug, logError} from '@utils/log';

// The timer only re-renders when the displayed second changes; polling more often than
// once a second keeps it from skipping a digit when the poll drifts across a boundary.
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

// setAudioModeAsync replaces the whole mode, resetting any field that is left out, so
// both modes spell every field out.
const RECORDING_AUDIO_MODE: AudioMode = {
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
    allowsBackgroundRecording: false,
};

const IDLE_AUDIO_MODE: AudioMode = {
    ...RECORDING_AUDIO_MODE,
    allowsRecording: false,
};

export type VoiceRecorderOptions = {
    maxDurationMs?: number;
    onFinish: (file: ExtractedFileInfo, maxDurationReached: boolean) => void;

    /** Called instead of `onFinish` when the recording was too short to keep. */
    onDiscard: () => void;
    onError: (error: unknown) => void;
};

type Session = {
    recorder: AudioRecorder;
    startedAt: Date;
    recording: boolean;
    tick?: ReturnType<typeof setInterval>;
    subscriptions: Array<{remove: () => void}>;
};

// The audio session is shared by the whole app, so only one voice note can be recorded at
// a time across every composer, and the session is only reset once nobody is recording.
let activeRecorder: AudioRecorder | null = null;
let pendingAudioReset: Promise<void> = Promise.resolve();

const createRecorder = () => {
    const {android, ios, web, ...common} = VOICE_NOTE_RECORDING_OPTIONS;
    const platformOptions = Platform.select<RecordingOptionsIos | RecordingOptionsAndroid | RecordingOptionsWeb>({ios, android, default: web});
    return new AudioModule.AudioRecorder({...common, ...platformOptions});
};

const resetAudioSession = async () => {
    // A call configures the audio session for itself; resetting it would cut the call's audio.
    if (activeRecorder || getCurrentCall()) {
        logDebug('useVoiceRecorder.resetAudioSession skipped while the audio session is in use');
        return;
    }

    try {
        await setAudioModeAsync(IDLE_AUDIO_MODE);
        await setIsAudioActiveAsync(false);
    } catch (error) {
        logDebug('useVoiceRecorder.resetAudioSession failed', getFullErrorMessage(error));
    }
};

const releaseRecorder = (recorder: AudioRecorder) => {
    recorder.release();
    if (activeRecorder === recorder) {
        activeRecorder = null;
    }
    pendingAudioReset = resetAudioSession();
    return pendingAudioReset;
};

/**
 * Records a voice note with expo-audio. The native recorder only exists while a
 * recording is in progress; `stop` resolves the recording into an `ExtractedFileInfo`
 * ready to be handed to the draft upload flow and `cancel` discards the temp file.
 *
 * Elapsed time comes from the native recorder, so it only counts audio that was actually
 * captured. The recording is stopped and kept (as if the user had tapped done) when it
 * reaches `maxDurationMs`, when the app goes to the background, when the system pauses the
 * recorder (e.g. a phone call) and when a Calls call starts, since none of these resume it.
 */
export const useVoiceRecorder = ({maxDurationMs = VOICE_NOTE_MAX_DURATION_MS, onFinish, onDiscard, onError}: VoiceRecorderOptions) => {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);

    const sessionRef = useRef<Session | null>(null);
    const onFinishRef = useRef(onFinish);
    const onDiscardRef = useRef(onDiscard);
    const onErrorRef = useRef(onError);
    onFinishRef.current = onFinish;
    onDiscardRef.current = onDiscard;
    onErrorRef.current = onError;

    // Detaches the current session synchronously so a second stop/cancel is a no-op.
    const endSession = useCallback(() => {
        const session = sessionRef.current;
        if (!session) {
            return undefined;
        }

        sessionRef.current = null;
        clearInterval(session.tick);
        session.subscriptions.forEach((subscription) => subscription.remove());
        setIsRecording(false);
        return session;
    }, []);

    const stop = useCallback(async (maxDurationReached = false) => {
        const session = endSession();
        if (!session) {
            logDebug('useVoiceRecorder.stop called while not recording');
            return;
        }

        // A recording that has not started yet is cleaned up by start once it resumes.
        if (!session.recording) {
            logDebug('useVoiceRecorder.stop called while starting');
            return;
        }

        const {recorder, startedAt} = session;
        try {
            const durationMs = recorder.getStatus().durationMillis;
            await recorder.stop();
            const uri = recorder.uri;
            if (!uri) {
                throw new Error('recorder did not produce a file');
            }

            if (durationMs < VOICE_NOTE_MIN_DURATION_MS) {
                logDebug('useVoiceRecorder.stop discarded a recording below the minimum duration', durationMs);
                deleteVoiceNoteFile(uri);
                onDiscardRef.current();
                return;
            }

            const name = getVoiceNoteFileName(startedAt, durationMs);
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
            deleteVoiceNoteFile(recorder.uri);
            onErrorRef.current(error);
        } finally {
            await releaseRecorder(recorder);
        }
    }, [endSession]);

    const cancel = useCallback(async () => {
        const session = endSession();
        if (!session) {
            logDebug('useVoiceRecorder.cancel called while not recording');
            return;
        }

        if (!session.recording) {
            logDebug('useVoiceRecorder.cancel called while starting');
            return;
        }

        const {recorder} = session;
        try {
            await recorder.stop();
        } catch (error) {
            logDebug('useVoiceRecorder.cancel failed to stop recorder', getFullErrorMessage(error));
        } finally {
            deleteVoiceNoteFile(recorder.uri);
            await releaseRecorder(recorder);
        }
    }, [endSession]);

    const handleStatusUpdate = useCallback(async (status: RecordingStatus) => {
        if (!status.hasError && !status.mediaServicesDidReset) {
            return;
        }

        // The recorder is no longer usable (encoder error or the media services were reset).
        logError('useVoiceRecorder recording failed', status.error);
        const cancelling = cancel();
        onErrorRef.current(new Error(status.error ?? 'recording was interrupted'));
        await cancelling;
    }, [cancel]);

    const start = useCallback(async () => {
        if (sessionRef.current) {
            logDebug('useVoiceRecorder.start called while already recording');
            return;
        }

        if (activeRecorder || getCurrentCall()) {
            logDebug('useVoiceRecorder.start called while the microphone is in use', {inCall: Boolean(getCurrentCall())});
            onErrorRef.current(new Error('the microphone is already in use'));
            return;
        }

        const recorder = createRecorder();
        const session: Session = {recorder, startedAt: new Date(), recording: false, subscriptions: []};
        sessionRef.current = session;
        activeRecorder = recorder;

        // Cancel, stop or unmount may end the session while start is awaiting; when that
        // happens start owns the clean-up, as the recorder may still be preparing.
        const abandon = async () => {
            logDebug('useVoiceRecorder.start abandoned before recording');
            deleteVoiceNoteFile(recorder.uri);
            await releaseRecorder(recorder);
        };

        try {
            await pendingAudioReset;
            await setAudioModeAsync(RECORDING_AUDIO_MODE);
            if (sessionRef.current !== session) {
                await abandon();
                return;
            }

            await recorder.prepareToRecordAsync();
            if (sessionRef.current !== session) {
                await abandon();
                return;
            }

            recorder.record();
            session.recording = true;
            setElapsedMs(0);
            setIsRecording(true);
            hapticFeedback();

            session.tick = setInterval(() => {
                const status = recorder.getStatus();
                if (!status.isRecording) {
                    // The system paused the recorder (e.g. a phone call) and will not resume it.
                    logDebug('useVoiceRecorder recorder was paused by the system');
                    stop();
                    return;
                }

                setElapsedMs(Math.floor(status.durationMillis / 1000) * 1000);
                if (status.durationMillis >= maxDurationMs) {
                    stop(true);
                }
            }, TIMER_TICK_MS);

            session.subscriptions.push(
                AppState.addEventListener('change', (appState) => {
                    if (appState === 'background') {
                        logDebug('useVoiceRecorder stopping as the app went to the background');
                        stop();
                    }
                }),
                recorder.addListener('recordingStatusUpdate', handleStatusUpdate),
            );

            // Emits straight away with the current call, covering a call that started while preparing.
            const callSubscription = observeCurrentCall().subscribe((call) => {
                if (call) {
                    logDebug('useVoiceRecorder stopping as a call started');
                    stop();
                }
            });
            session.subscriptions.push({remove: () => callSubscription.unsubscribe()});
        } catch (error) {
            if (sessionRef.current !== session) {
                await abandon();
                return;
            }

            logError('useVoiceRecorder.start', getFullErrorMessage(error));
            endSession();
            await abandon();
            onErrorRef.current(error);
        }
    }, [endSession, handleStatusUpdate, maxDurationMs, stop]);

    // Discard any in-progress recording if the owner unmounts mid-way, so no orphaned temp
    // files or recorders remain.
    useEffect(() => {
        return () => {
            const session = endSession();
            if (!session?.recording) {
                return;
            }

            const {recorder} = session;
            recorder.stop().
                catch((error) => logDebug('useVoiceRecorder.unmount failed to stop recorder', getFullErrorMessage(error))).
                finally(() => {
                    deleteVoiceNoteFile(recorder.uri);
                    releaseRecorder(recorder);
                });
        };
    }, [endSession]);

    return {
        isRecording,
        elapsedMs,
        start,
        stop,
        cancel,
    };
};
