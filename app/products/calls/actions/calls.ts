// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import InCallManager from 'react-native-incall-manager';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {updateThreadFollowing} from '@actions/remote/thread';
import {fetchUsersByIds} from '@actions/remote/user';
import {
    endCallConfirmationAlert,
    leaveAndJoinWithAlert,
    needsRecordingErrorAlert,
    needsRecordingWillBePostedAlert,
    showErrorAlertOnClose,
} from '@calls/alerts';
import {
    getCallsConfig,
    getCallsState,
    getChannelsWithCalls,
    getCurrentCall,
    myselfLeftCall,
    newCurrentCall,
    setCurrentCallConnected,
    setCallForChannel,
    setCalls,
    setChannelEnabled,
    setConfig,
    setPluginEnabled,
    setScreenShareURL,
    setSpeakerPhone,
} from '@calls/state';
import {type AudioDevice, type Call, type CallSession, type CallsConnection, EndCallReturn} from '@calls/types/calls';
import {areGroupCallsAllowed} from '@calls/utils';
import {General, Preferences} from '@constants';
import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {getConfig, getLicense} from '@queries/servers/system';
import {getThreadById} from '@queries/servers/thread';
import {getCurrentUser, getUserById} from '@queries/servers/user';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {displayUsername, getUserIdFromChannelName, isSystemAdmin} from '@utils/user';

import {newConnection} from '../connection/connection';

import type {CallChannelState, CallState, EmojiData} from '@mattermost/calls/lib/types';
import type {IntlShape} from 'react-intl';

let connection: CallsConnection | null = null;
export const getConnectionForTesting = () => connection;

export const loadConfig = async (serverUrl: string, force = false, groupLabel?: RequestGroupLabel) => {
    const now = Date.now();
    const config = getCallsConfig(serverUrl);

    if (!force) {
        const lastRetrievedAt = config.last_retrieved_at || 0;
        if ((now - lastRetrievedAt) < Calls.RefreshConfigMillis) {
            return {data: config};
        }
    }

    try {
        const client = NetworkManager.getClient(serverUrl);
        const configs = await Promise.all([client.getCallsConfig(groupLabel), client.getVersion(groupLabel)]);
        const nextConfig = {...configs[0], version: configs[1], last_retrieved_at: now};
        setConfig(serverUrl, nextConfig);
        return {data: nextConfig};
    } catch (error) {
        logDebug('error on loadConfig', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const loadCalls = async (serverUrl: string, userId: string, groupLabel?: RequestGroupLabel) => {
    let resp: CallChannelState[] = [];
    try {
        const client = NetworkManager.getClient(serverUrl);
        resp = await client.getCalls(groupLabel) || [];
    } catch (error) {
        logDebug('error on loadCalls', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    const callsResults: Dictionary<Call> = {};
    const enabledChannels: Dictionary<boolean> = {};
    const ids = new Set<string>();

    for (const channel of resp) {
        if (channel.call) {
            callsResults[channel.channel_id] = createCallAndAddToIds(channel.channel_id, channel.call, ids);
        }

        if (typeof channel.enabled !== 'undefined') {
            enabledChannels[channel.channel_id] = channel.enabled;
        }
    }

    // Batch load user models async because we'll need them later
    if (ids.size > 0) {
        fetchUsersByIds(serverUrl, Array.from(ids), false, groupLabel);
    }

    setCalls(serverUrl, userId, callsResults, enabledChannels);

    return {data: {calls: callsResults, enabled: enabledChannels}};
};

export const loadCallForChannel = async (serverUrl: string, channelId: string) => {
    let resp: CallChannelState;
    try {
        const client = NetworkManager.getClient(serverUrl);
        resp = await client.getCallForChannel(channelId);
    } catch (error) {
        logDebug('error on loadCallForChannel', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    let call: Call | undefined;
    const ids = new Set<string>();
    if (resp.call) {
        call = createCallAndAddToIds(channelId, resp.call, ids);
    }

    // Batch load user models async because we'll need them later
    if (ids.size > 0) {
        fetchUsersByIds(serverUrl, Array.from(ids));
    }

    setCallForChannel(serverUrl, channelId, call, resp.enabled);

    return {data: {call, enabled: resp.enabled}};
};

export const createCallAndAddToIds = (channelId: string, call: CallState, ids?: Set<string>) => {
    // Don't cast so that we get alerted to missing types
    const convertedCall: Call = {
        sessions: Object.values(call.sessions).reduce((accum, cur) => {
            // Add the id to the set of UserModels we want to ensure are loaded.
            ids?.add(cur.user_id);

            // Create the CallParticipant
            accum[cur.session_id] = {
                userId: cur.user_id,
                sessionId: cur.session_id,
                raisedHand: cur.raised_hand || 0,
                muted: !cur.unmuted,
            };
            return accum;
        }, {} as Dictionary<CallSession>),
        channelId,
        id: call.id,
        startTime: call.start_at,
        screenOn: call.screen_sharing_session_id,
        threadId: call.thread_id,
        ownerId: call.owner_id,
        hostId: call.host_id,
        recState: call.recording,
        dismissed: call.dismissed_notification || {},
    };

    return convertedCall;
};

export const loadConfigAndCalls = async (serverUrl: string, userId: string, groupLabel?: RequestGroupLabel) => {
    const res = await checkIsCallsPluginEnabled(serverUrl);
    if (res.data) {
        loadConfig(serverUrl, true, groupLabel);
        loadCalls(serverUrl, userId, groupLabel);
    }
};

export const checkIsCallsPluginEnabled = async (serverUrl: string) => {
    let data: ClientPluginManifest[] = [];
    try {
        const client = NetworkManager.getClient(serverUrl);
        data = await client.getPluginsManifests();
    } catch (error) {
        logDebug('error on checkIsCallsPluginEnabled', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    const enabled = data.findIndex((m) => m.id === Calls.PluginId) !== -1;
    const curEnabled = getCallsConfig(serverUrl).pluginEnabled;
    if (enabled !== curEnabled) {
        setPluginEnabled(serverUrl, enabled);
    }

    return {data: enabled};
};

export const enableChannelCalls = async (serverUrl: string, channelId: string, enable: boolean) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const res = await client.enableChannelCalls(channelId, enable);
        if (res.enabled === enable) {
            setChannelEnabled(serverUrl, channelId, enable);
        }
        return {};
    } catch (error) {
        logDebug('error on enableChannelCalls', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const joinCall = async (
    serverUrl: string,
    channelId: string,
    userId: string,
    hasMicPermission: boolean,
    intl: IntlShape,
    title?: string,
    rootId?: string,
): Promise<{ error?: unknown; data?: string }> => {
    // Edge case: calls was disabled when app loaded, and then enabled, but app hasn't
    // reconnected its websocket since then (i.e., hasn't called batchLoadCalls yet)
    const {data: enabled} = await checkIsCallsPluginEnabled(serverUrl);
    if (!enabled) {
        return {error: 'calls plugin not enabled'};
    }

    if (connection) {
        connection.disconnect();
        connection = null;
    }
    setSpeakerphoneOn(false);
    newCurrentCall(serverUrl, channelId, userId);

    try {
        connection = await newConnection(serverUrl, channelId, (err?: Error) => {
            myselfLeftCall();
            if (err) {
                logDebug('calls: error on close', getFullErrorMessage(err));
                showErrorAlertOnClose(err, intl);
            }
        }, setScreenShareURL, hasMicPermission, title, rootId);
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    try {
        const sessionId = await connection.waitForPeerConnection();

        setCurrentCallConnected(channelId, sessionId);

        // Follow the thread.
        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!database) {
            return {data: channelId};
        }

        // If this was a call started by ourselves, then we should have subscribed in the start_call ws handler
        // (unless we received the start_call ws before the post/thread ws).
        // If this was us joining an existing call, follow the thread here.
        const call = getCallsState(serverUrl).calls[channelId];
        if (call && call.threadId) {
            const thread = await getThreadById(database, call.threadId);
            if (thread && !thread.isFollowing) {
                const channel = await getChannelById(database, channelId);
                updateThreadFollowing(serverUrl, channel?.teamId || '', call.threadId, true, false);
            }
        }

        return {data: channelId};
    } catch (e) {
        connection.disconnect();
        connection = null;
        return {error: `unable to connect to the voice call: ${e}`};
    }
};

export const leaveCall = (err?: Error) => {
    if (connection) {
        connection.disconnect(err);
        connection = null;
    }
};

export const leaveCallConfirmation = async (
    intl: IntlShape,
    otherParticipants: boolean,
    isAdmin: boolean,
    isHost: boolean,
    serverUrl: string,
    channelId: string,
    leaveCb?: () => void) => {
    const showHostControls = (isHost || isAdmin) && otherParticipants;
    const ret = await endCallConfirmationAlert(intl, showHostControls) as EndCallReturn;
    switch (ret) {
        case EndCallReturn.Cancel:
            return;
        case EndCallReturn.LeaveCall:
            leaveCall();
            leaveCb?.();
            return;
        case EndCallReturn.EndCall:
            endCall(serverUrl, channelId);
            leaveCb?.();
    }
};

export const muteMyself = () => {
    if (connection) {
        connection.mute();
    }
};

export const unmuteMyself = () => {
    if (connection) {
        connection.unmute();
    }
};

export const initializeVoiceTrack = () => {
    if (connection) {
        connection.initializeVoiceTrack();
    }
};

export const raiseHand = () => {
    if (connection) {
        connection.raiseHand();
    }
};

export const unraiseHand = () => {
    if (connection) {
        connection.unraiseHand();
    }
};

export const sendReaction = (emoji: EmojiData) => {
    if (connection) {
        connection.sendReaction(emoji);
    }
};

export const setSpeakerphoneOn = (speakerphoneOn: boolean) => {
    InCallManager.setForceSpeakerphoneOn(speakerphoneOn);
    setSpeakerPhone(speakerphoneOn);
};

export const setPreferredAudioRoute = async (audio: AudioDevice) => {
    return InCallManager.chooseAudioRoute(audio);
};

export const canEndCall = async (serverUrl: string, channelId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return false;
    }

    const currentUser = await getCurrentUser(database);
    if (!currentUser) {
        return false;
    }

    const call = getCallsState(serverUrl).calls[channelId];
    if (!call) {
        return false;
    }

    return isSystemAdmin(currentUser.roles) || currentUser.id === call.hostId;
};

export const getEndCallMessage = async (serverUrl: string, channelId: string, currentUserId: string, intl: IntlShape) => {
    let msg = intl.formatMessage({
        id: 'mobile.calls_end_msg_channel_default',
        defaultMessage: 'Are you sure you want to end the call?',
    });

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return msg;
    }

    const channel = await getChannelById(database, channelId);
    if (!channel) {
        return msg;
    }

    const call = getCallsState(serverUrl).calls[channelId];
    if (!call) {
        return msg;
    }

    const numSessions = Object.keys(call.sessions).length;

    msg = intl.formatMessage({
        id: 'mobile.calls_end_msg_channel',
        defaultMessage: 'Are you sure you want to end a call with {numParticipants} participants in {displayName}?',
    }, {numParticipants: numSessions, displayName: channel.displayName});

    if (channel.type === General.DM_CHANNEL) {
        const otherID = getUserIdFromChannelName(currentUserId, channel.name);
        const otherUser = await getUserById(database, otherID);
        const license = await getLicense(database);
        const config = await getConfig(database);
        const preferences = await queryDisplayNamePreferences(database, Preferences.NAME_NAME_FORMAT).fetch();
        const displaySetting = getTeammateNameDisplaySetting(preferences, config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
        msg = intl.formatMessage({
            id: 'mobile.calls_end_msg_dm',
            defaultMessage: 'Are you sure you want to end the call with {displayName}?',
        }, {displayName: displayUsername(otherUser, intl.locale, displaySetting)});
    }

    return msg;
};

export const endCall = async (serverUrl: string, channelId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.endCall(channelId);
        return data;
    } catch (error) {
        logDebug('error on endCall', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        throw error;
    }
};

export const startCallRecording = async (serverUrl: string, callId: string) => {
    needsRecordingErrorAlert();
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.startCallRecording(callId);
        return data;
    } catch (error) {
        logDebug('error on startCallRecording', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

export const stopCallRecording = async (serverUrl: string, callId: string) => {
    needsRecordingWillBePostedAlert();
    needsRecordingErrorAlert();

    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.stopCallRecording(callId);
        return data;
    } catch (error) {
        logDebug('error on stopCallRecording', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

export const dismissIncomingCall = async (serverUrl: string, channelId: string) => {
    if (!getCallsConfig(serverUrl).EnableRinging) {
        return {};
    }

    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.dismissCall(channelId);
    } catch (error) {
        logDebug('error on dismissIncomingCall', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

// handleCallsSlashCommand will return true if the slash command was handled
export const handleCallsSlashCommand = async (value: string, serverUrl: string, channelId: string, channelType: string, rootId: string, currentUserId: string, intl: IntlShape):
    Promise<{ handled?: boolean; error?: string }> => {
    const tokens = value.split(' ');
    if (tokens.length < 2 || tokens[0] !== '/call') {
        return {handled: false};
    }

    switch (tokens[1]) {
        case 'end':
            await handleEndCall(serverUrl, channelId, currentUserId, intl);
            return {handled: true};
        case 'start': {
            if (!areGroupCallsAllowed(getCallsConfig(serverUrl)) && channelType !== General.DM_CHANNEL) {
                return {
                    error: intl.formatMessage({
                        id: 'mobile.calls_group_calls_not_available',
                        defaultMessage: 'Calls are only available in DM channels.',
                    }),
                };
            }

            if (getChannelsWithCalls(serverUrl)[channelId]) {
                return {
                    error: intl.formatMessage({
                        id: 'mobile.calls_start_call_exists',
                        defaultMessage: 'A call is already ongoing in the channel.',
                    }),
                };
            }
            const title = tokens.length > 2 ? tokens.slice(2).join(' ') : undefined;
            await leaveAndJoinWithAlert(intl, serverUrl, channelId, title, rootId);
            return {handled: true};
        }
        case 'join': {
            if (!areGroupCallsAllowed(getCallsConfig(serverUrl)) && channelType !== General.DM_CHANNEL) {
                return {
                    error: intl.formatMessage({
                        id: 'mobile.calls_group_calls_not_available',
                        defaultMessage: 'Calls are only available in DM channels.',
                    }),
                };
            }

            const title = tokens.length > 2 ? tokens.slice(2).join(' ') : undefined;
            await leaveAndJoinWithAlert(intl, serverUrl, channelId, title, rootId);
            return {handled: true};
        }
        case 'leave':
            if (getCurrentCall()?.channelId === channelId) {
                leaveCall();
                return {handled: true};
            }
            return {
                error: intl.formatMessage({
                    id: 'mobile.calls_not_connected',
                    defaultMessage: 'You\'re not connected to a call in the current channel.',
                }),
            };
        case 'recording': {
            if (tokens.length < 3) {
                return {handled: false};
            }

            const action = tokens[2];
            const currentCall = getCurrentCall();
            const recording = currentCall?.recState;
            const isHost = currentCall?.hostId === currentUserId;

            if (currentCall?.channelId !== channelId) {
                return {
                    error: intl.formatMessage({
                        id: 'mobile.calls_not_connected',
                        defaultMessage: 'You\'re not connected to a call in the current channel.',
                    }),
                };
            }

            if (action === 'start') {
                if (recording && recording.start_at > recording.end_at) {
                    return {
                        error: intl.formatMessage({
                            id: 'mobile.calls_recording_start_in_progress',
                            defaultMessage: 'A recording is already in progress.',
                        }),
                    };
                }

                if (!isHost) {
                    return {
                        error: intl.formatMessage({
                            id: 'mobile.calls_recording_start_no_permissions',
                            defaultMessage: 'You don\'t have permissions to start a recording. Please ask the call host to start a recording.',
                        }),
                    };
                }

                await startCallRecording(currentCall.serverUrl, currentCall.channelId);

                return {handled: true};
            }

            if (action === 'stop') {
                if (!recording || recording.end_at > recording.start_at) {
                    return {
                        error: intl.formatMessage({
                            id: 'mobile.calls_recording_stop_none_in_progress',
                            defaultMessage: 'No recording is in progress.',
                        }),
                    };
                }

                if (!isHost) {
                    return {
                        error: intl.formatMessage({
                            id: 'mobile.calls_recording_stop_no_permissions',
                            defaultMessage: 'You don\'t have permissions to stop the recording. Please ask the call host to stop the recording.',
                        }),
                    };
                }

                await stopCallRecording(currentCall.serverUrl, currentCall.channelId);

                return {handled: true};
            }
        }
    }

    return {handled: false};
};

const handleEndCall = async (serverUrl: string, channelId: string, currentUserId: string, intl: IntlShape) => {
    const hasPermissions = await canEndCall(serverUrl, channelId);

    if (!hasPermissions) {
        Alert.alert(
            intl.formatMessage({
                id: 'mobile.calls_end_permission_title',
                defaultMessage: 'Error',
            }),
            intl.formatMessage({
                id: 'mobile.calls_end_permission_msg',
                defaultMessage: 'You don\'t have permission to end the call. Please ask the call host to end the call.',
            }));
        return;
    }

    const message = await getEndCallMessage(serverUrl, channelId, currentUserId, intl);
    const title = intl.formatMessage({id: 'mobile.calls_end_call_title', defaultMessage: 'End call'});

    Alert.alert(
        title,
        message,
        [
            {
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
            },
            {
                text: title,
                onPress: async () => {
                    try {
                        await endCall(serverUrl, channelId);
                    } catch (e) {
                        const err = getFullErrorMessage(e);
                        Alert.alert('Error', `Error: ${err}`);
                    }
                },
                style: 'cancel',
            },
        ],
    );
};

export const hostMake = async (serverUrl: string, callId: string, newHostId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.hostMake(callId, newHostId);
    } catch (error) {
        logDebug('error on hostMake', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

export const hostMuteSession = async (serverUrl: string, callId: string, sessionId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.hostMute(callId, sessionId);
    } catch (error) {
        logDebug('error on hostMute', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

export const hostMuteOthers = async (serverUrl: string, callId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.hostMuteOthers(callId);
    } catch (error) {
        logDebug('error on hostMuteOthers', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

export const hostStopScreenshare = async (serverUrl: string, callId: string, sessionId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.hostScreenOff(callId, sessionId);
    } catch (error) {
        logDebug('error on hostStopScreenshare', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

export const hostLowerHand = async (serverUrl: string, callId: string, sessionId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.hostLowerHand(callId, sessionId);
    } catch (error) {
        logDebug('error on hostLowerHand', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};

export const hostRemove = async (serverUrl: string, callId: string, sessionId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.hostRemove(callId, sessionId);
    } catch (error) {
        logDebug('error on hostRemove', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return error;
    }
};
