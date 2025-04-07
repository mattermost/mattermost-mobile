// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, type AlertButton, Platform} from 'react-native';

import {hasMicrophonePermission, hasCameraPermission, joinCall, leaveCall, unmuteMyself} from '@calls/actions';
import {dismissIncomingCall, hostRemove} from '@calls/actions/calls';
import {hasBluetoothPermission} from '@calls/actions/permissions';
import {hostRemovedErr, userLeftChannelErr, userRemovedFromChannelErr} from '@calls/errors';
import {
    getCallsConfig,
    getCallsState,
    getChannelsWithCalls,
    getCurrentCall,
    removeIncomingCall,
    setMicPermissionsGranted,
    setCameraPermissionsGranted,
} from '@calls/state';
import {EndCallReturn} from '@calls/types/calls';
import {errorAlert} from '@calls/utils';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getCurrentUser} from '@queries/servers/user';
import {dismissBottomSheet} from '@screens/navigation';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {isSystemAdmin} from '@utils/user';

import type {LimitRestrictedInfo} from '@calls/observers';
import type {IntlShape} from 'react-intl';

// Only unlock when:
// - Joining a new call.
// - A new recording has started.
// - Host has changed to current user.
let recordingAlertLock = true;

// Only unlock if/when the user starts a recording.
let recordingWillBePostedLock = true;

// Only unlock when starting/stopping a recording.
let recordingErrorLock = true;

export const showLimitRestrictedAlert = (info: LimitRestrictedInfo, intl: IntlShape) => {
    const title = intl.formatMessage({
        id: 'mobile.calls_participant_limit_title_GA',
        defaultMessage: 'This call is at capacity',
    });
    let message = intl.formatMessage({
        id: 'mobile.calls_limit_msg',
        defaultMessage: 'The maximum number of participants per call is {maxParticipants}. Contact your System Admin to increase the limit.',
    }, {maxParticipants: info.maxParticipants});
    if (info.isCloudStarter) {
        message = intl.formatMessage({
            id: 'mobile.calls_limit_msg_GA',
            defaultMessage: 'Upgrade to Cloud Professional or Cloud Enterprise to enable group calls with more than {maxParticipants} participants.',
        }, {maxParticipants: info.maxParticipants});
    }
    const ok = intl.formatMessage({
        id: 'mobile.calls_ok',
        defaultMessage: 'Okay',
    });

    Alert.alert(
        title,
        message,
        [
            {
                text: ok,
                style: 'cancel',
            },
        ],
    );
};

export const leaveAndJoinWithAlert = async (
    intl: IntlShape,
    joinServerUrl: string,
    joinChannelId: string,
    title?: string,
    rootId?: string,
) => {
    let leaveChannelName = '';
    let joinChannelName = '';
    let joinChannelIsDMorGM = false;
    let leaveServerUrl = '';
    let leaveChannelId = '';
    const newCall = !getChannelsWithCalls(joinServerUrl)[joinChannelId];

    try {
        const {database: joinDatabase} = DatabaseManager.getServerDatabaseAndOperator(joinServerUrl);
        const joinChannel = await getChannelById(joinDatabase, joinChannelId);
        joinChannelName = joinChannel?.displayName || '';
        joinChannelIsDMorGM = joinChannel ? isDMorGM(joinChannel) : false;

        const currentCall = getCurrentCall();
        if (currentCall) {
            const {database: leaveDatabase} = DatabaseManager.getServerDatabaseAndOperator(currentCall.serverUrl);
            const leaveChannel = await getChannelById(leaveDatabase, currentCall.channelId);
            leaveChannelName = leaveChannel?.displayName || '';
            leaveServerUrl = currentCall.serverUrl;
            leaveChannelId = currentCall.channelId;
        }
    } catch (error) {
        logError('failed to getServerDatabase in leaveAndJoinWithAlert', error);
        return false;
    }

    if (leaveServerUrl && leaveChannelId) {
        const {formatMessage} = intl;

        let joinMessage = formatMessage({
            id: 'mobile.leave_and_join_message',
            defaultMessage: 'You are already on a channel call in ~{leaveChannelName}. Do you want to leave your current call and join the call in ~{joinChannelName}?',
        }, {leaveChannelName, joinChannelName});
        if (newCall) {
            joinMessage = formatMessage({
                id: 'mobile.leave_and_join_message',
                defaultMessage: 'You are already on a channel call in ~{leaveChannelName}. Do you want to leave your current call and start a new call in ~{joinChannelName}?',
            }, {leaveChannelName, joinChannelName});
        }

        const asyncAlert = async () => new Promise((resolve) => {
            Alert.alert(
                formatMessage({
                    id: 'mobile.leave_and_join_title',
                    defaultMessage: 'Are you sure you want to switch to a different call?',
                }),
                joinMessage,
                [
                    {
                        text: formatMessage({
                            id: 'mobile.post.cancel',
                            defaultMessage: 'Cancel',
                        }),
                        onPress: () => resolve(false),
                        style: 'destructive',
                    },
                    {
                        text: formatMessage({
                            id: 'mobile.leave_and_join_confirmation',
                            defaultMessage: 'Leave & Join',
                        }),
                        onPress: async () => resolve(await doJoinCall(joinServerUrl, joinChannelId, joinChannelIsDMorGM, newCall, intl, title, rootId)),
                        isPreferred: true,
                    },
                ],
            );
        });

        return asyncAlert();
    }

    return doJoinCall(joinServerUrl, joinChannelId, joinChannelIsDMorGM, newCall, intl, title, rootId);
};

const doJoinCall = async (
    serverUrl: string,
    channelId: string,
    joinChannelIsDMorGM: boolean,
    newCall: boolean,
    intl: IntlShape,
    title?: string,
    rootId?: string,
) => {
    const {formatMessage} = intl;

    const config = getCallsConfig(serverUrl);

    let user;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        user = await getCurrentUser(database);
        if (!user) {
            // This shouldn't happen, so don't bother localizing and displaying an alert.
            return false;
        }

        if (newCall) {
            const enabled = getCallsState(serverUrl).enabled[channelId];
            const isAdmin = isSystemAdmin(user.roles);

            // if explicitly disabled, we wouldn't get to this point.
            // if pre-GA calls:
            //   if enabled is false, then this channel was returned as enabled=false from the server (it was either
            //     explicitly disabled, or DefaultEnabled=false), and the StartCall button would not be shown
            //   if enabled is true, then this channel was return as enabled=true from the server (it was either
            //     explicitly enabled, or DefaultEnabled=true), everyone can start
            // if GA calls:
            //   if explicitly enabled, everyone can start a call
            //   if !explicitly enabled and defaultEnabled, everyone can start
            //   if !explicitly enabled and !defaultEnabled, system admins can start, regular users get alert
            // Note: the below is a 'badly' coded if. But it's clear, which trumps.
            if (enabled || (!enabled && config.DefaultEnabled) || (!enabled && !config.DefaultEnabled && isAdmin)) {
                // continue through and start the call
            } else {
                contactAdminAlert(intl);
                return false;
            }
        }
    } catch (error) {
        logError('failed to getServerDatabaseAndOperator in doJoinCall', error);
        return false;
    }

    recordingAlertLock = false;
    recordingWillBePostedLock = true; // only unlock if/when the user stops a recording.

    await hasBluetoothPermission();
    const hasMicPermission = await hasMicrophonePermission();
    setMicPermissionsGranted(hasMicPermission);

    let hasCamPermission = false;
    if (config.EnableVideo) {
        hasCamPermission = await hasCameraPermission();
        setCameraPermissionsGranted(hasCamPermission);
    }

    if (!newCall && joinChannelIsDMorGM) {
        // we're joining an existing call, so dismiss any notifications (for all clients, too)
        const callId = getCallsState(serverUrl).calls[channelId].id;
        dismissIncomingCall(serverUrl, channelId);
        removeIncomingCall(serverUrl, callId, channelId);
    }

    const res = await joinCall(serverUrl, channelId, user.id, hasMicPermission, hasCamPermission, intl, title, rootId);
    if (res.error) {
        const seeLogs = formatMessage({id: 'mobile.calls_see_logs', defaultMessage: 'See server logs'});
        errorAlert(res.error?.toString() || seeLogs, intl);
        return false;
    }

    if (joinChannelIsDMorGM) {
        unmuteMyself();
    }

    return true;
};

const contactAdminAlert = ({formatMessage}: IntlShape) => {
    Alert.alert(
        formatMessage({
            id: 'mobile.calls_request_title',
            defaultMessage: 'Calls is not currently enabled',
        }),
        formatMessage({
            id: 'mobile.calls_request_message',
            defaultMessage: 'Calls are currently running in test mode and only system admins can start them. Reach out directly to your system admin for assistance',
        }),
        [{
            text: formatMessage({
                id: 'mobile.calls_okay',
                defaultMessage: 'Okay',
            }),
        }],
    );
};

export const needsRecordingAlert = () => {
    recordingAlertLock = false;
};

export const recordingAlert = (isHost: boolean, transcriptionsEnabled: boolean, intl: IntlShape) => {
    if (recordingAlertLock) {
        return;
    }
    recordingAlertLock = true;

    const {formatMessage} = intl;

    const hostTitle = formatMessage({
        id: 'mobile.calls_host_rec_title',
        defaultMessage: 'You are recording',
    });
    const hostMessage = formatMessage({
        id: 'mobile.calls_host_rec',
        defaultMessage: 'Consider letting everyone know that this meeting is being recorded.',
    });

    const participantTitle = formatMessage({
        id: 'mobile.calls_participant_rec_title',
        defaultMessage: 'Recording is in progress',
    });
    const participantMessage = formatMessage({
        id: 'mobile.calls_participant_rec',
        defaultMessage: 'The host has started recording this meeting. By staying in the meeting you give consent to being recorded.',
    });

    const hostTranscriptionTitle = formatMessage({
        id: 'mobile.calls_host_transcription_title',
        defaultMessage: 'Recording and transcription has started',
    });
    const hostTranscriptionMessage = formatMessage({
        id: 'mobile.calls_host_transcription',
        defaultMessage: 'Consider letting everyone know that this meeting is being recorded and transcribed.',
    });

    const participantTranscriptionTitle = formatMessage({
        id: 'mobile.calls_participant_transcription_title',
        defaultMessage: 'Recording and transcription is in progress',
    });
    const participantTranscriptionMessage = formatMessage({
        id: 'mobile.calls_participant_transcription',
        defaultMessage: 'The host has started recording and transcription for this meeting. By staying in the meeting, you give consent to being recorded and transcribed.',
    });

    const hTitle = transcriptionsEnabled ? hostTranscriptionTitle : hostTitle;
    const hMessage = transcriptionsEnabled ? hostTranscriptionMessage : hostMessage;
    const pTitle = transcriptionsEnabled ? participantTranscriptionTitle : participantTitle;
    const pMessage = transcriptionsEnabled ? participantTranscriptionMessage : participantMessage;

    const participantButtons = [
        {
            text: formatMessage({
                id: 'mobile.calls_leave',
                defaultMessage: 'Leave',
            }),
            onPress: async () => {
                leaveCall();
            },
            style: 'destructive',
        },
        {
            text: formatMessage({
                id: 'mobile.calls_okay',
                defaultMessage: 'Okay',
            }),
            style: 'default',
        },
    ];
    const hostButton = [{
        text: formatMessage({
            id: 'mobile.calls_dismiss',
            defaultMessage: 'Dismiss',
        }),
    }];

    Alert.alert(
        isHost ? hTitle : pTitle,
        isHost ? hMessage : pMessage,
        isHost ? hostButton : participantButtons,
    );
};

export const stopRecordingConfirmationAlert = (intl: IntlShape, enableTranscriptions: boolean) => {
    const {formatMessage} = intl;

    const asyncAlert = async () => new Promise((resolve) => {
        let title = formatMessage({
            id: 'mobile.calls_host_rec_stop_title',
            defaultMessage: 'Stop recording',
        });
        let body = formatMessage({
            id: 'mobile.calls_host_rec_stop_body',
            defaultMessage: 'The call recording will be processed and posted in the call thread. Are you sure you want to stop the recording?',
        });

        if (enableTranscriptions) {
            title = formatMessage({
                id: 'mobile.calls_host_rec_trans_stop_title',
                defaultMessage: 'Stop recording and transcription',
            });
            body = formatMessage({
                id: 'mobile.calls_host_rec_trans_stop_body',
                defaultMessage: 'The call recording and transcription files will be processed and posted in the call thread. Are you sure you want to stop the recording and transcription?',
            });
        }

        Alert.alert(
            title,
            body,
            [{
                text: formatMessage({
                    id: 'mobile.calls_cancel',
                    defaultMessage: 'Cancel',
                }),
                onPress: () => resolve(false),
                style: 'cancel',
            }, {
                text: formatMessage({
                    id: 'mobile.calls_host_rec_stop_confirm',
                    defaultMessage: 'Stop recording',
                }),
                onPress: () => resolve(true),
                style: 'destructive',
            }],
        );
    });

    return asyncAlert();
};

export const needsRecordingWillBePostedAlert = () => {
    recordingWillBePostedLock = false;
};

export const recordingWillBePostedAlert = (intl: IntlShape) => {
    if (recordingWillBePostedLock) {
        return;
    }
    recordingWillBePostedLock = true;

    const {formatMessage} = intl;

    Alert.alert(
        formatMessage({
            id: 'mobile.calls_host_rec_stopped_title',
            defaultMessage: 'Recording has stopped. Processing...',
        }),
        formatMessage({
            id: 'mobile.calls_host_rec_stopped',
            defaultMessage: 'You can find the recording in this call\'s chat thread once it\'s finished processing.',
        }),
        [{
            text: formatMessage({
                id: 'mobile.calls_dismiss',
                defaultMessage: 'Dismiss',
            }),
        }],
    );
};

export const needsRecordingErrorAlert = () => {
    recordingErrorLock = false;
};

export const recordingErrorAlert = (intl: IntlShape) => {
    if (recordingErrorLock) {
        return;
    }
    recordingErrorLock = true;

    const {formatMessage} = intl;

    Alert.alert(
        formatMessage({
            id: 'mobile.calls_host_rec_error_title',
            defaultMessage: 'Something went wrong with the recording',
        }),
        formatMessage({
            id: 'mobile.calls_host_rec_error',
            defaultMessage: 'Please try to record again. You can also contact your system admin for troubleshooting help.',
        }),
        [{
            text: formatMessage({
                id: 'mobile.calls_dismiss',
                defaultMessage: 'Dismiss',
            }),
        }],
    );
};

export const showErrorAlertOnClose = (err: Error, intl: IntlShape) => {
    switch (err) {
        case userLeftChannelErr:
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.calls_user_left_channel_error_title',
                    defaultMessage: 'You left the channel',
                }),
                intl.formatMessage({
                    id: 'mobile.calls_user_left_channel_error_message',
                    defaultMessage: 'You have left the channel, and have been disconnected from the call.',
                }),
            );
            break;
        case userRemovedFromChannelErr:
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.calls_user_removed_from_channel_error_title',
                    defaultMessage: 'You were removed from channel',
                }),
                intl.formatMessage({
                    id: 'mobile.calls_user_removed_from_channel_error_message',
                    defaultMessage: 'You have been removed from the channel, and have been disconnected from the call.',
                }),
            );
            break;
        case hostRemovedErr:
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.calls_removed_alert_title',
                    defaultMessage: 'You were removed from the call',
                }),
                intl.formatMessage({
                    id: 'mobile.calls_removed_alert_body',
                    defaultMessage: 'The host removed you from the call.',
                }),
                [{
                    text: intl.formatMessage({
                        id: 'mobile.calls_dismiss',
                        defaultMessage: 'Dismiss',
                    }),
                }]);
            break;
        default:
            // Fallback with generic error
            errorAlert(getFullErrorMessage(err, intl), intl);
    }
};

export const removeFromCall = (serverUrl: string, displayName: string, callId: string, sessionId: string, intl: IntlShape) => {
    const {formatMessage} = intl;

    const title = formatMessage({
        id: 'mobile.calls_remove_alert_title',
        defaultMessage: 'Remove participant',
    });
    const body = formatMessage({
        id: 'mobile.calls_remove_alert_body',
        defaultMessage: 'Are you sure you want to remove {displayName} from the call? ',
    }, {displayName});

    Alert.alert(title, body, [{
        text: formatMessage({
            id: 'mobile.post.cancel',
            defaultMessage: 'Cancel',
        }),
    }, {
        text: formatMessage({
            id: 'mobile.calls_remove',
            defaultMessage: 'Remove',
        }),
        onPress: () => {
            hostRemove(serverUrl, callId, sessionId);
            dismissBottomSheet();
        },
        style: 'destructive',
    }]);
};

export const endCallConfirmationAlert = (intl: IntlShape, showHostControls: boolean) => {
    const {formatMessage} = intl;

    const asyncAlert = async () => new Promise((resolve) => {
        const buttons: AlertButton[] = [{
            text: formatMessage({
                id: 'mobile.calls_cancel',
                defaultMessage: 'Cancel',
            }),
            onPress: () => resolve(EndCallReturn.Cancel),
            style: 'cancel',
        }, {
            text: formatMessage({
                id: 'mobile.calls_host_leave_confirm',
                defaultMessage: 'Leave call',
            }),
            onPress: () => resolve(EndCallReturn.LeaveCall),
            style: 'destructive',
        }];
        const questionMsg = formatMessage({
            id: 'mobile.calls_host_leave_title',
            defaultMessage: 'Are you sure you want to leave this call?',
        });

        if (showHostControls) {
            const endCallButton: AlertButton = {
                text: formatMessage({
                    id: 'mobile.calls_host_end_confirm',
                    defaultMessage: 'End call for everyone',
                }),
                onPress: () => resolve(EndCallReturn.EndCall),
                style: 'destructive',
            };
            const leaveCallButton = {
                text: formatMessage({
                    id: 'mobile.calls_host_leave_confirm',
                    defaultMessage: 'Leave call',
                }),
                onPress: () => resolve(EndCallReturn.LeaveCall),
            };

            if (Platform.OS === 'ios') {
                buttons.splice(1, 1, endCallButton, leaveCallButton);
            } else {
                buttons.splice(1, 1, leaveCallButton, endCallButton);
            }
        }

        if (Platform.OS === 'ios') {
            Alert.alert(questionMsg, '', buttons);
        } else {
            Alert.alert('', questionMsg, buttons);
        }
    });

    return asyncAlert();
};
