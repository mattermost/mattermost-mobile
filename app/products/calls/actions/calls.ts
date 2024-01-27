// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import InCallManager from 'react-native-incall-manager';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {updateThreadFollowing} from '@actions/remote/thread';
import {fetchUsersByIds} from '@actions/remote/user';
import {
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
    setCallForChannel,
    setCalls,
    setChannelEnabled,
    setConfig,
    setPluginEnabled,
    setScreenShareURL,
    setSpeakerPhone,
} from '@calls/state';
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

import type {AudioDevice, Call, CallSession, CallsConnection} from '@calls/types/calls';
import type {CallChannelState, CallState, EmojiData, SessionState} from '@mattermost/calls/lib/types';
import type {IntlShape} from 'react-intl';

let connection: CallsConnection | null = null;
export const getConnectionForTesting = () => connection;

export const loadConfig = async (serverUrl: string, force = false) => {
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
        const configs = await Promise.all([client.getCallsConfig(), client.getVersion()]);
        const nextConfig = {...configs[0], version: configs[1], last_retrieved_at: now};
        setConfig(serverUrl, nextConfig);
        return {data: nextConfig};
    } catch (error) {
        logDebug('error on loadConfig', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const loadCalls = async (serverUrl: string, userId: string) => {
    let resp: CallChannelState[] = [];
    try {
        const client = NetworkManager.getClient(serverUrl);
        resp = await client.getCalls() || [];
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
            callsResults[channel.channel_id] = createCallAndAddToIds(channel.channel_id, convertOldCallToNew(channel.call), ids);
        }

        if (typeof channel.enabled !== 'undefined') {
            enabledChannels[channel.channel_id] = channel.enabled;
        }
    }

    // Batch load user models async because we'll need them later
    if (ids.size > 0) {
        fetchUsersByIds(serverUrl, Array.from(ids));
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
        call = createCallAndAddToIds(channelId, convertOldCallToNew(resp.call), ids);
    }

    // Batch load user models async because we'll need them later
    if (ids.size > 0) {
        fetchUsersByIds(serverUrl, Array.from(ids));
    }

    setCallForChannel(serverUrl, channelId, resp.enabled, call);

    return {data: {call, enabled: resp.enabled}};
};

// Converts pre-0.21.0 call to 0.21.0+ call. Can be removed when we stop supporting pre-0.21.0
// Also can be removed: all code prefaced with a "Pre v0.21.0, sessionID == userID" comment
// Does nothing if the call is in the new format.
const convertOldCallToNew = (call: CallState): CallState => {
    if (call.sessions) {
        return call;
    }

    return {
        ...call,
        sessions: call.users.reduce((accum, cur, curIdx) => {
            accum.push({
                session_id: cur,
                user_id: cur,
                unmuted: call.states && call.states[curIdx] ? call.states[curIdx].unmuted : false,
                raised_hand: call.states && call.states[curIdx] ? call.states[curIdx].raised_hand : 0,
            });
            return accum;
        }, [] as SessionState[]),
        screen_sharing_session_id: call.screen_sharing_id,
    };
};

const createCallAndAddToIds = (channelId: string, call: CallState, ids: Set<string>) => {
    return {
        sessions: Object.values(call.sessions).reduce((accum, cur) => {
            // Add the id to the set of UserModels we want to ensure are loaded.
            ids.add(cur.user_id);

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
    } as Call;
};

export const loadConfigAndCalls = async (serverUrl: string, userId: string) => {
    const res = await checkIsCallsPluginEnabled(serverUrl);
    if (res.data) {
        loadConfig(serverUrl, true);
        loadCalls(serverUrl, userId);
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
        await connection.waitForPeerConnection();

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

    return isSystemAdmin(currentUser.roles) || currentUser.id === call.ownerId;
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
        defaultMessage: 'Are you sure you want to end a call with {numSessions} participants in {displayName}?',
    }, {numSessions, displayName: channel.displayName});

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
export const handleCallsSlashCommand = async (value: string, serverUrl: string, channelId: string, rootId: string, currentUserId: string, intl: IntlShape):
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
            const title = tokens.length > 2 ? tokens.slice(2).join(' ') : undefined;
            await leaveAndJoinWithAlert(intl, serverUrl, channelId, title, rootId);
            return {handled: true};
        }
        case 'leave':
            if (getCurrentCall()?.channelId === channelId) {
                await leaveCall();
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
                defaultMessage: 'You don\'t have permission to end the call. Please ask the call owner to end the call.',
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
