// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    useAudioRecorder,
    type RecordingOptions,
    type RecordingStatus,
} from 'expo-audio';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert, AppState, Linking, Modal, Text, View} from 'react-native';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {getFullErrorMessage} from '@utils/errors';
import {deleteFile} from '@utils/file';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {createVoiceMessageFile} from '@utils/voice_message';

import type {VoiceRecordActionProps} from './types';

const STOP_TIMEOUT_MS = 10000;
const STATUS_INTERVAL_MS = 200;

const VOICE_RECORDING_OPTIONS: RecordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    bitRate: 64000,
    numberOfChannels: 1,
    android: {
        ...RecordingPresets.HIGH_QUALITY.android,
        audioSource: 'voice_recognition',
    },
};

const messages = defineMessages({
    accessibilityLabel: {
        id: 'voice_message.record.accessibility_label',
        defaultMessage: 'Record voice message',
    },
    title: {
        id: 'voice_message.record.title',
        defaultMessage: 'Voice message',
    },
    preparing: {
        id: 'voice_message.record.preparing',
        defaultMessage: 'Preparing microphone…',
    },
    recording: {
        id: 'voice_message.record.recording',
        defaultMessage: 'Recording…',
    },
    finishing: {
        id: 'voice_message.record.finishing',
        defaultMessage: 'Finishing recording…',
    },
    description: {
        id: 'voice_message.record.description',
        defaultMessage: 'Tap “Stop & attach” when you’re finished. Nothing is sent until you send the draft.',
    },
    cancel: {
        id: 'voice_message.record.cancel',
        defaultMessage: 'Cancel',
    },
    stopAndAttach: {
        id: 'voice_message.record.stop_and_attach',
        defaultMessage: 'Stop & attach',
    },
    permissionTitle: {
        id: 'voice_message.permission.title',
        defaultMessage: 'Microphone access needed',
    },
    permissionDescription: {
        id: 'voice_message.permission.description',
        defaultMessage: 'Allow microphone access in Settings to record a voice message.',
    },
    settings: {
        id: 'voice_message.permission.settings',
        defaultMessage: 'Settings',
    },
    failureTitle: {
        id: 'voice_message.record.failure_title',
        defaultMessage: 'Unable to record voice message',
    },
    failureDescription: {
        id: 'voice_message.record.failure_description',
        defaultMessage: 'The recording could not be created. Check microphone access and try again.',
    },
});

type StopWaiter = {
    reject: (error: Error) => void;
    resolve: (status: RecordingStatus) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    iconContainer: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 20,
        alignItems: 'center',
        alignSelf: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        marginRight: 8,
    },
    backdrop: {
        alignItems: 'center',
        backgroundColor: changeOpacity('#000000', 0.55),
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    dialog: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 12,
        maxWidth: 400,
        padding: 24,
        width: '100%',
    },
    title: {
        color: theme.centerChannelColor,
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    statusContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        marginTop: 24,
    },
    recordingDot: {
        backgroundColor: theme.errorTextColor,
        borderRadius: 5,
        height: 10,
        width: 10,
    },
    status: {
        color: theme.centerChannelColor,
        fontSize: 16,
    },
    timer: {
        color: theme.centerChannelColor,
        fontSize: 36,
        fontVariant: ['tabular-nums'],
        fontWeight: '300',
        marginTop: 12,
        textAlign: 'center',
    },
    description: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        fontSize: 14,
        lineHeight: 20,
        marginTop: 16,
        textAlign: 'center',
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
        marginTop: 24,
    },
    button: {
        flex: 1,
    },
}));

function formatDuration(durationMillis: number) {
    const totalSeconds = Math.floor(durationMillis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function VoiceRecordAction({disabled, onUploadFiles, testID}: VoiceRecordActionProps) {
    const intl = useIntl();
    const theme = useTheme();
    const {blurAndDismissKeyboard} = useKeyboardState();
    const style = getStyleSheet(theme);
    const [isBusy, setIsBusy] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [durationMillis, setDurationMillis] = useState(0);
    const busyRef = useRef(false);
    const mountedRef = useRef(true);
    const preparedRef = useRef(false);
    const recordingStartedRef = useRef(false);
    const stopWaiterRef = useRef<StopWaiter | null>(null);

    const showFailure = useCallback(() => {
        if (!mountedRef.current) {
            return;
        }
        busyRef.current = false;
        preparedRef.current = false;
        recordingStartedRef.current = false;
        setIsBusy(false);
        setHasStarted(false);
        setIsModalVisible(false);
        Alert.alert(intl.formatMessage(messages.failureTitle), intl.formatMessage(messages.failureDescription));
    }, [intl]);

    const onRecordingStatus = useCallback((status: RecordingStatus) => {
        if (!status.isFinished) {
            return;
        }

        const waiter = stopWaiterRef.current;
        if (waiter) {
            stopWaiterRef.current = null;
            if (status.hasError) {
                waiter.reject(new Error(status.error || 'Native recorder failed to stop'));
            } else {
                waiter.resolve(status);
            }
            return;
        }

        if (status.hasError) {
            logError('voice recording native error', status.error || 'unknown error');
            showFailure();
        }
    }, [showFailure]);

    const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS, onRecordingStatus);

    const stopRecorder = useCallback(() => {
        return new Promise<RecordingStatus>((resolve, reject) => {
            const timeout = setTimeout(() => {
                stopWaiterRef.current = null;
                reject(new Error('Timed out waiting for the voice recording to stop'));
            }, STOP_TIMEOUT_MS);

            const clearAndReject = (error: Error) => {
                clearTimeout(timeout);
                reject(error);
            };

            stopWaiterRef.current = {
                resolve: (status) => {
                    clearTimeout(timeout);
                    resolve(status);
                },
                reject: clearAndReject,
            };

            recorder.stop().catch((error: unknown) => {
                const waiter = stopWaiterRef.current;
                stopWaiterRef.current = null;
                waiter?.reject(error instanceof Error ? error : new Error(getFullErrorMessage(error)));
            });
        });
    }, [recorder]);

    const startRecording = useCallback(async () => {
        if (disabled || busyRef.current) {
            return;
        }

        busyRef.current = true;
        setIsBusy(true);
        try {
            await blurAndDismissKeyboard();
            const permission = await requestRecordingPermissionsAsync();
            if (!mountedRef.current) {
                return;
            }
            if (!permission.granted) {
                Alert.alert(
                    intl.formatMessage(messages.permissionTitle),
                    intl.formatMessage(messages.permissionDescription),
                    [{
                        text: intl.formatMessage(messages.cancel),
                        style: 'cancel',
                    }, {
                        text: intl.formatMessage(messages.settings),
                        onPress: () => Linking.openSettings(),
                    }],
                );
                return;
            }

            setDurationMillis(0);
            setIsModalVisible(true);
            await recorder.prepareToRecordAsync();
            preparedRef.current = true;

            if (!mountedRef.current || AppState.currentState !== 'active') {
                const uri = recorder.uri;
                await recorder.stop().catch(() => undefined);
                preparedRef.current = false;
                if (uri) {
                    deleteFile(uri);
                }
                if (mountedRef.current) {
                    setIsModalVisible(false);
                }
                return;
            }

            recorder.record();
            recordingStartedRef.current = true;
            setHasStarted(true);
        } catch (error) {
            const uri = recorder.uri;
            if (preparedRef.current || recordingStartedRef.current) {
                await recorder.stop().catch(() => undefined);
                if (uri) {
                    deleteFile(uri);
                }
            }
            logError('unable to start voice recording', getFullErrorMessage(error));
            showFailure();
        } finally {
            busyRef.current = false;
            if (mountedRef.current) {
                setIsBusy(false);
            }
        }
    }, [blurAndDismissKeyboard, disabled, intl, recorder, showFailure]);

    const cancelRecording = useCallback(async () => {
        if (busyRef.current) {
            return;
        }

        busyRef.current = true;
        setIsBusy(true);
        const uri = recorder.uri;
        try {
            if (preparedRef.current || recordingStartedRef.current) {
                await recorder.stop().catch((error: unknown) => {
                    logError('unable to stop cancelled voice recording', getFullErrorMessage(error));
                });
            }
        } finally {
            preparedRef.current = false;
            recordingStartedRef.current = false;
            if (uri) {
                deleteFile(uri);
            }
            busyRef.current = false;
            if (mountedRef.current) {
                setHasStarted(false);
                setIsModalVisible(false);
                setIsBusy(false);
            }
        }
    }, [recorder]);

    const stopAndAttach = useCallback(async () => {
        if (busyRef.current || !recordingStartedRef.current) {
            return;
        }

        busyRef.current = true;
        setIsBusy(true);
        let uri: string | null = recorder.uri;
        try {
            const status = await stopRecorder();
            preparedRef.current = false;
            recordingStartedRef.current = false;
            uri = status.url || uri;
            if (!uri) {
                throw new Error('The native recorder returned no file');
            }
            if (!mountedRef.current) {
                deleteFile(uri);
                return;
            }

            const file = createVoiceMessageFile(uri);
            onUploadFiles([file]);
            setHasStarted(false);
            setIsModalVisible(false);
        } catch (error) {
            if (uri) {
                deleteFile(uri);
            }
            logError('unable to attach voice recording', getFullErrorMessage(error));
            showFailure();
        } finally {
            busyRef.current = false;
            if (mountedRef.current) {
                setIsBusy(false);
            }
        }
    }, [onUploadFiles, recorder.uri, showFailure, stopRecorder]);

    useEffect(() => {
        if (!isModalVisible) {
            return undefined;
        }

        const updateDuration = () => setDurationMillis(recorder.getStatus().durationMillis);
        updateDuration();
        const interval = setInterval(updateDuration, STATUS_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [isModalVisible, recorder]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState !== 'active' && (preparedRef.current || recordingStartedRef.current)) {
                cancelRecording();
            }
        });
        return () => subscription.remove();
    }, [cancelRecording]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            stopWaiterRef.current?.reject(new Error('Voice recorder unmounted'));
            stopWaiterRef.current = null;

            if (preparedRef.current || recordingStartedRef.current) {
                const uri = recorder.uri;
                preparedRef.current = false;
                recordingStartedRef.current = false;
                recorder.stop().catch(() => undefined).finally(() => {
                    if (uri) {
                        deleteFile(uri);
                    }
                });
            }
        };
    }, [recorder]);

    const isDisabled = disabled || isBusy;
    const actionTestID = isDisabled ? `${testID}.disabled` : testID;
    let statusMessage = messages.recording;
    if (isBusy && hasStarted) {
        statusMessage = messages.finishing;
    } else if (isBusy) {
        statusMessage = messages.preparing;
    }
    const iconColor = isDisabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <>
            <TouchableWithFeedback
                accessibilityLabel={intl.formatMessage(messages.accessibilityLabel)}
                accessibilityRole='button'
                testID={actionTestID}
                disabled={isDisabled}
                onPress={startRecording}
                style={style.iconContainer}
                type='opacity'
            >
                <CompassIcon
                    name='microphone-outline'
                    size={ICON_SIZE}
                    color={iconColor}
                />
            </TouchableWithFeedback>
            <Modal
                animationType='fade'
                onRequestClose={cancelRecording}
                testID={`${testID}.modal`}
                transparent={true}
                visible={isModalVisible}
            >
                <View style={style.backdrop}>
                    <View style={style.dialog}>
                        <Text style={style.title}>
                            {intl.formatMessage(messages.title)}
                        </Text>
                        <View style={style.statusContainer}>
                            <View style={style.recordingDot}/>
                            <Text style={style.status}>
                                {intl.formatMessage(statusMessage)}
                            </Text>
                        </View>
                        <Text
                            style={style.timer}
                            testID={`${testID}.timer`}
                        >
                            {formatDuration(durationMillis)}
                        </Text>
                        <Text style={style.description}>
                            {intl.formatMessage(messages.description)}
                        </Text>
                        <View style={style.buttons}>
                            <Button
                                buttonContainerStyle={style.button}
                                disabled={isBusy}
                                onPress={cancelRecording}
                                testID={`${testID}.cancel`}
                                text={intl.formatMessage(messages.cancel)}
                                theme={theme}
                            />
                            <Button
                                buttonContainerStyle={style.button}
                                disabled={isBusy || !hasStarted}
                                emphasis='primary'
                                onPress={stopAndAttach}
                                showLoader={isBusy && hasStarted}
                                testID={`${testID}.attach`}
                                text={intl.formatMessage(messages.stopAndAttach)}
                                theme={theme}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}
