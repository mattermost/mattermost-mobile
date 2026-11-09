// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage, defineMessages, type IntlShape, type MessageDescriptor} from 'react-intl';
import {Alert, type AlertButton, Platform} from 'react-native';

import {hasMicrophonePermission, joinCall, leaveCall, unmuteMyself} from '@calls/actions';
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
} from '@calls/state';
import {CallPostStatus, EndCallReturn, type PhoneTarget} from '@calls/types/calls';
import {errorAlert} from '@calls/utils';
import ClientError from '@client/rest/error';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getCurrentUser} from '@queries/servers/user';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';
import {isDMChannel, isTypeDMorGM} from '@utils/channel';
import {getFullErrorMessage, isServerError} from '@utils/errors';
import {logDebug, logError} from '@utils/log';
import {isSystemAdmin} from '@utils/user';

import type {LimitRestrictedInfo} from '@calls/observers';

// Only unlock when:
// - Joining a new call.
// - A new recording has started.
// - Host has changed to current user.
let recordingAlertLock = true;

// Only unlock if/when the user starts a recording.
let recordingWillBePostedLock = true;

// Only unlock when starting/stopping a recording.
let recordingErrorLock = true;

const phoneCallErrorTitle = defineMessage({
    id: 'mobile.calls_phone_error.title',
    defaultMessage: 'Unable to place phone call',
});

const phoneCallErrors = defineMessages({
    invalidNumber: {
        id: 'mobile.calls_phone_error.invalid_number',
        defaultMessage: 'That doesn\'t look like a valid phone number.',
    },
    ambiguousNumber: {
        id: 'mobile.calls_phone_error.ambiguous_number',
        defaultMessage: 'Start international numbers with + and the country code.',
    },
    outboundUnavailable: {
        id: 'mobile.calls_phone_error.outbound_unavailable',
        defaultMessage: 'Phone calls aren\'t available. Contact your system admin.',
    },
    numberNotAllowed: {
        id: 'mobile.calls_phone_error.number_not_allowed',
        defaultMessage: 'Calling this number isn\'t permitted.',
    },
    teamNotAllowed: {
        id: 'mobile.calls_phone_error.team_not_allowed',
        defaultMessage: 'You don\'t have permission to place phone calls.',
    },
    invalidTarget: {
        id: 'mobile.calls_phone_error.invalid_target',
        defaultMessage: 'The person you\'re trying to call couldn\'t be found.',
    },
    callInProgress: {
        id: 'mobile.calls_phone_error.call_in_progress',
        defaultMessage: 'You\'re already on a phone call.',
    },
    noResponse: {
        id: 'mobile.calls_phone_error.no_response',
        defaultMessage: 'Couldn\'t reach the server. Check your connection and try again.',
    },
    fallback: {
        id: 'mobile.calls_phone_error.fallback',
        defaultMessage: 'The call couldn\'t be placed. Please try again.',
    },
});

const phoneCallErrorByServerID: Record<string, MessageDescriptor> = {
    invalid_number: phoneCallErrors.invalidNumber,
    ambiguous_number: phoneCallErrors.ambiguousNumber,
    outbound_disabled: phoneCallErrors.outboundUnavailable,
    outbound_not_configured: phoneCallErrors.outboundUnavailable,
    sip_number_not_allowed: phoneCallErrors.numberNotAllowed,
    sip_team_not_allowed: phoneCallErrors.teamNotAllowed,
    invalid_target: phoneCallErrors.invalidTarget,
    call_in_progress: phoneCallErrors.callInProgress,
};

const phoneCallOutcomes = defineMessages({
    noAnswerTitle: {
        id: 'mobile.calls_phone_outcome.no_answer_title',
        defaultMessage: 'No answer',
    },
    noAnswer: {
        id: 'mobile.calls_phone_outcome.no_answer',
        defaultMessage: 'Nobody answered the call.',
    },
    declinedTitle: {
        id: 'mobile.calls_phone_outcome.declined_title',
        defaultMessage: 'Call declined',
    },
    declined: {
        id: 'mobile.calls_phone_outcome.declined',
        defaultMessage: 'The number you called is busy or declined the call.',
    },
});

// Keyed on call ID, not channel: every phone call reuses the same bot DM.
let placedPhoneCall: {serverUrl: string; callId: string; intl: IntlShape} | undefined;

export const expectPhoneCallOutcome = (serverUrl: string, callId: string | undefined, intl: IntlShape) => {
    if (callId) {
        placedPhoneCall = {serverUrl, callId, intl};
    }
};

export const showPhoneCallOutcome = (serverUrl: string, callId: string | undefined, reason?: string) => {
    if (!placedPhoneCall || placedPhoneCall.serverUrl !== serverUrl || placedPhoneCall.callId !== callId) {
        return;
    }

    const {intl} = placedPhoneCall;
    placedPhoneCall = undefined;

    switch (reason) {
        case CallPostStatus.NoAnswer:
            Alert.alert(intl.formatMessage(phoneCallOutcomes.noAnswerTitle), intl.formatMessage(phoneCallOutcomes.noAnswer));
            break;
        case CallPostStatus.Declined:
            Alert.alert(intl.formatMessage(phoneCallOutcomes.declinedTitle), intl.formatMessage(phoneCallOutcomes.declined));
            break;
        case CallPostStatus.Failed:
            showPhoneCallError(intl, phoneCallErrors.fallback);
            break;
        default:
            logDebug('showPhoneCallOutcome: no alert for the call ending reason');
    }
};

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
    let joinChannelType: ChannelType | undefined;
    let leaveServerUrl = '';
    let leaveChannelId = '';
    const newCall = !getChannelsWithCalls(joinServerUrl)[joinChannelId];

    try {
        const {database: joinDatabase} = DatabaseManager.getServerDatabaseAndOperator(joinServerUrl);
        const joinChannel = await getChannelById(joinDatabase, joinChannelId);
        joinChannelName = joinChannel?.displayName || '';
        joinChannelType = joinChannel?.type;

        // Don't prompt to leave a call if it's the same call we're joining.
        // Skip if the current call matches the join channel and server.
        const currentCall = getCurrentCall();
        if (currentCall && !(currentCall.serverUrl === joinServerUrl && currentCall.channelId === joinChannelId)) {
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
                id: 'mobile.leave_and_create_message',
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
                        onPress: async () => resolve(await doJoinCall(joinServerUrl, joinChannelId, joinChannelType, newCall, intl, title, rootId)),
                        isPreferred: true,
                    },
                ],
            );
        });

        return asyncAlert();
    }

    return doJoinCall(joinServerUrl, joinChannelId, joinChannelType, newCall, intl, title, rootId);
};

const doJoinCall = async (
    serverUrl: string,
    channelId: string,
    channelType: ChannelType | undefined,
    newCall: boolean,
    intl: IntlShape,
    title?: string,
    rootId?: string,
) => {
    const {formatMessage} = intl;

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
            const {DefaultEnabled} = getCallsConfig(serverUrl);
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
            if (enabled || (!enabled && DefaultEnabled) || (!enabled && !DefaultEnabled && isAdmin)) {
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
    const hasPermission = await hasMicrophonePermission();
    setMicPermissionsGranted(hasPermission);

    const isDMorGM = isTypeDMorGM(channelType);

    if (!newCall && isDMorGM) {
        // we're joining an existing call, so dismiss any notifications (for all clients, too)
        const callId = getCallsState(serverUrl).calls[channelId].id;
        dismissIncomingCall(serverUrl, channelId);
        removeIncomingCall(serverUrl, callId, channelId);
    }

    // newCall means there was no call in the channel to join, so this one is ours: the call view
    // needs to know that before the server's call_start event arrives with the owner. A 1:1 DM call
    // we place is also live from the moment we're in it, per the unmute below.
    const res = await joinCall(serverUrl, {type: 'channel', channelID: channelId}, user.id, hasPermission, intl, title, rootId, {
        startedByMe: newCall,
        startUnmuted: newCall && isDMChannel(channelType) && hasPermission,
    });
    if (res.error) {
        const seeLogs = formatMessage({id: 'mobile.calls_see_logs', defaultMessage: 'See server logs'});
        errorAlert(res.error?.toString() || seeLogs, intl);
        return false;
    }

    if (isDMorGM) {
        unmuteMyself();
    }

    return true;
};

const showPhoneCallError = (intl: IntlShape, message: MessageDescriptor) => {
    Alert.alert(intl.formatMessage(phoneCallErrorTitle), intl.formatMessage(message));
};

let phoneCallInProgress = false;

export const startPhoneCall = async (intl: IntlShape, serverUrl: string, phone: PhoneTarget) => {
    if (phoneCallInProgress) {
        return;
    }
    phoneCallInProgress = true;

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const user = await getCurrentUser(database);
        if (!user) {
            logDebug('startPhoneCall: no current user');
            return;
        }

        if (!getCallsConfig(serverUrl).DefaultEnabled && !isSystemAdmin(user.roles)) {
            contactAdminAlert(intl);
            return;
        }

        recordingAlertLock = false;
        recordingWillBePostedLock = true;

        await hasBluetoothPermission();
        const hasPermission = await hasMicrophonePermission();
        setMicPermissionsGranted(hasPermission);

        const res = await joinCall(serverUrl, {type: 'phone', phone}, user.id, hasPermission, intl, undefined, undefined, {
            startedByMe: true,
            startUnmuted: hasPermission,
        });
        if (res.error) {
            const serverErrorId = isServerError(res.error) ? res.error.server_error_id : undefined;
            const noResponse = res.error instanceof ClientError && res.error.status_code === undefined;
            showPhoneCallError(intl, (serverErrorId && phoneCallErrorByServerID[serverErrorId]) || (noResponse ? phoneCallErrors.noResponse : phoneCallErrors.fallback));
            return;
        }

        unmuteMyself();
        navigateToScreen(Screens.CALL);
    } catch (error) {
        logError('error on startPhoneCall', getFullErrorMessage(error));
        showPhoneCallError(intl, phoneCallErrors.fallback);
    } finally {
        phoneCallInProgress = false;
    }
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
        defaultMessage: 'You are recording this meeting. Consider letting everyone know that this meeting is being recorded.',
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

export const endCallConfirmationAlert = (intl: IntlShape) => {
    const {formatMessage} = intl;

    const asyncAlert = async () => new Promise((resolve) => {
        const cancelButton: AlertButton = {
            text: formatMessage({
                id: 'mobile.calls_cancel',
                defaultMessage: 'Cancel',
            }),
            onPress: () => resolve(EndCallReturn.Cancel),
            style: 'cancel',
        };
        const endCallButton: AlertButton = {
            text: formatMessage({
                id: 'mobile.calls_host_end_confirm',
                defaultMessage: 'End call for everyone',
            }),
            onPress: () => resolve(EndCallReturn.EndCall),
            style: 'destructive',
        };
        const leaveCallButton: AlertButton = {
            text: formatMessage({
                id: 'mobile.calls_host_leave_confirm',
                defaultMessage: 'Leave call',
            }),
            onPress: () => resolve(EndCallReturn.LeaveCall),
        };
        const buttons = Platform.OS === 'ios' ? [cancelButton, endCallButton, leaveCallButton] : [cancelButton, leaveCallButton, endCallButton];

        const questionMsg = formatMessage({
            id: 'mobile.calls_host_leave_title',
            defaultMessage: 'Are you sure you want to leave this call?',
        });

        if (Platform.OS === 'ios') {
            Alert.alert(questionMsg, '', buttons);
        } else {
            Alert.alert('', questionMsg, buttons);
        }
    });

    return asyncAlert();
};
