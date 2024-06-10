// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {mosThreshold} from '@mattermost/calls/lib/rtc_monitor';
import {Navigation} from 'react-native-navigation';

import {updateThreadFollowing} from '@actions/remote/thread';
import {needsRecordingAlert} from '@calls/alerts';
import {
    getCallsConfig,
    getCallsState,
    getChannelsWithCalls,
    getCurrentCall,
    getGlobalCallsState,
    getIncomingCalls,
    setCallsConfig,
    setCallsState,
    setChannelsWithCalls,
    setCurrentCall,
    setGlobalCallsState,
    setIncomingCalls,
} from '@calls/state';
import {
    type AudioDeviceInfo,
    type Call,
    type CallsConfigState,
    type ChannelsWithCalls,
    ChannelType,
    type CurrentCall,
    DefaultCall,
    DefaultCurrentCall,
    type IncomingCallNotification,
    type LiveCaptionMobile,
    type ReactionStreamEmoji,
} from '@calls/types/calls';
import {Calls, General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getThreadById} from '@queries/servers/thread';
import {getUserById} from '@queries/servers/user';
import {isDMorGM} from '@utils/channel';
import {generateId} from '@utils/general';
import {logDebug} from '@utils/log';

import type {CallJobState, LiveCaptionData, UserReactionData} from '@mattermost/calls/lib/types';

export const setCalls = async (serverUrl: string, myUserId: string, calls: Dictionary<Call>, enabled: Dictionary<boolean>) => {
    const channelsWithCalls = Object.keys(calls).reduce(
        (accum, next) => {
            accum[next] = true;
            return accum;
        }, {} as ChannelsWithCalls);
    setChannelsWithCalls(serverUrl, channelsWithCalls);

    setCallsState(serverUrl, {myUserId, calls, enabled});

    await processIncomingCalls(serverUrl, Object.values(calls), false);

    // Does the current call need to be updated?
    const currentCall = getCurrentCall();
    if (!currentCall || !calls[currentCall.channelId]) {
        return;
    }

    // Edge case: if the app went into the background and lost the main ws connection, we don't know who is currently
    // talking. Instead of guessing, erase voiceOn state (same state as when joining an ongoing call).
    const nextCall = {
        ...currentCall,
        ...calls[currentCall.channelId],
        voiceOn: {},
    };
    setCurrentCall(nextCall);
};

export const processIncomingCalls = async (serverUrl: string, calls: Call[], keepExisting = true) => {
    if (!getCallsConfig(serverUrl).EnableRinging) {
        return;
    }

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    // Do we have incoming calls we should notify about?
    const incomingCalls = getIncomingCalls().incomingCalls;
    const existingCalls = getCallsState(serverUrl).calls;
    const myUserId = getCallsState(serverUrl).myUserId;
    const newIncoming: IncomingCallNotification[] = [];

    for await (const call of calls) {
        // dismissed already?
        if (call.dismissed[myUserId] || existingCalls[call.channelId]?.dismissed[myUserId]) {
            continue;
        }

        // already in our incomingCalls notifications?
        if (incomingCalls.findIndex((c) => c.callID === call.id) >= 0) {
            continue;
        }

        // Never send a notification for a call you started, or a call you are currently in.
        if (myUserId === call.ownerId || getCurrentCall()?.id === call.id) {
            continue;
        }

        const channel = await getChannelById(database, call.channelId);
        if (!channel) {
            logDebug('calls: processIncomingCalls could not find channel by id', call.channelId, 'for serverUrl', serverUrl);
            continue;
        }

        if (!isDMorGM(channel)) {
            continue;
        }

        const callerModel = await getUserById(database, call.ownerId);

        newIncoming.push({
            serverUrl,
            myUserId,
            callID: call.id,
            callerID: call.ownerId,
            callerModel,
            channelID: call.channelId,
            startAt: call.startTime,
            type: channel.type === General.DM_CHANNEL ? ChannelType.DM : ChannelType.GM,
        });
    }

    if (newIncoming.length === 0 && keepExisting) {
        return;
    }

    if (keepExisting) {
        newIncoming.push(...incomingCalls);
    } else {
        const removedThisServer = incomingCalls.filter((ic) => ic.serverUrl !== serverUrl);
        newIncoming.push(...removedThisServer);
    }

    if (newIncoming.length === 0 && incomingCalls.length === 0) {
        return;
    }

    newIncoming.sort((a, b) => a.startAt - b.startAt);
    setIncomingCalls({incomingCalls: newIncoming});
};

const getChannelIdFromCallId = (serverUrl: string, callId: string) => {
    const callsState = getCallsState(serverUrl);
    for (const call of Object.values(callsState.calls)) {
        if (call.id === callId) {
            return call.channelId;
        }
    }
    return undefined;
};

export const removeIncomingCall = (serverUrl: string, callId: string, channelId?: string) => {
    if (!getCallsConfig(serverUrl).EnableRinging) {
        return;
    }

    const incomingCalls = getIncomingCalls();
    const newIncomingCalls = incomingCalls.incomingCalls.filter((ic) => ic.callID !== callId);
    if (incomingCalls.incomingCalls.length !== newIncomingCalls.length) {
        setIncomingCalls({incomingCalls: newIncomingCalls});
    }

    let chId = channelId;
    if (!chId) {
        chId = getChannelIdFromCallId(serverUrl, callId);
        if (!chId) {
            return;
        }
    }

    const callsState = getCallsState(serverUrl);
    const nextCalls = {...callsState.calls};
    if (nextCalls[chId]) {
        nextCalls[chId].dismissed[callsState.myUserId] = true;
    }
    setCallsState(serverUrl, {...callsState, calls: nextCalls});
};

export const setCallForChannel = (serverUrl: string, channelId: string, enabled?: boolean, call?: Call) => {
    const callsState = getCallsState(serverUrl);
    let nextEnabled = callsState.enabled;
    if (typeof enabled !== 'undefined') {
        nextEnabled = {...callsState.enabled, [channelId]: enabled};
    }

    const nextCalls = {...callsState.calls};
    if (call) {
        nextCalls[channelId] = call;

        // In case we got a complete update on the currentCall
        const currentCall = getCurrentCall();
        if (currentCall?.channelId === channelId) {
            setCurrentCall({
                ...currentCall,
                ...call,
            });
        }
    } else {
        delete nextCalls[channelId];
    }

    setCallsState(serverUrl, {...callsState, calls: nextCalls, enabled: nextEnabled});

    const channelsWithCalls = getChannelsWithCalls(serverUrl);
    if (call && !channelsWithCalls[channelId]) {
        const nextChannelsWithCalls = {...channelsWithCalls};
        nextChannelsWithCalls[channelId] = true;
        setChannelsWithCalls(serverUrl, nextChannelsWithCalls);
    } else if (!call && channelsWithCalls[channelId]) {
        const nextChannelsWithCalls = {...channelsWithCalls};
        delete nextChannelsWithCalls[channelId];
        setChannelsWithCalls(serverUrl, nextChannelsWithCalls);
    }
};

export const userJoinedCall = (serverUrl: string, channelId: string, userId: string, sessionId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]) {
        return;
    }

    const nextCall = {
        ...callsState.calls[channelId],
        sessions: {...callsState.calls[channelId].sessions},
    };
    nextCall.sessions[sessionId] = {
        userId,
        sessionId,
        muted: true,
        raisedHand: 0,
    };
    const nextCalls = {...callsState.calls, [channelId]: nextCall};

    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Did the user join the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (currentCall && currentCall.channelId === channelId) {
        const voiceOn = {...currentCall.voiceOn};
        delete voiceOn[sessionId];

        const nextCurrentCall = {
            ...currentCall,
            sessions: {...currentCall.sessions, [sessionId]: nextCall.sessions[sessionId]},
            voiceOn,
        };

        // If this is the currentUser, that means we've connected to the call we created.
        if (userId === nextCurrentCall.myUserId && !nextCurrentCall.connected) {
            nextCurrentCall.connected = true;
            nextCurrentCall.mySessionId = sessionId;
        }

        setCurrentCall(nextCurrentCall);
    }

    // We've joined (from whatever client), so remove that call's notification
    if (userId === callsState.myUserId) {
        removeIncomingCall(serverUrl, callsState.calls[channelId].id, channelId);
    }
};

export const userLeftCall = (serverUrl: string, channelId: string, sessionId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]?.sessions[sessionId]) {
        return;
    }

    const nextCall = {
        ...callsState.calls[channelId],
        sessions: {...callsState.calls[channelId].sessions},
    };
    delete nextCall.sessions[sessionId];

    // If they were screensharing, remove that.
    if (nextCall.screenOn === sessionId) {
        nextCall.screenOn = '';
    }

    const nextCalls = {...callsState.calls};
    if (Object.keys(nextCall.sessions).length === 0) {
        delete nextCalls[channelId];

        const callId = callsState.calls[channelId].id;
        removeIncomingCall(serverUrl, callId, channelId);

        const channelsWithCalls = getChannelsWithCalls(serverUrl);
        const nextChannelsWithCalls = {...channelsWithCalls};
        delete nextChannelsWithCalls[channelId];
        setChannelsWithCalls(serverUrl, nextChannelsWithCalls);
    } else {
        nextCalls[channelId] = nextCall;
    }

    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Did the user leave the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    if (sessionId === currentCall.mySessionId) {
        myselfLeftCall();
        return;
    }

    // Clear them from the voice list
    const voiceOn = {...currentCall.voiceOn};
    delete voiceOn[sessionId];

    const nextCurrentCall = {
        ...currentCall,
        sessions: {...currentCall.sessions},
        voiceOn,
    };
    delete nextCurrentCall.sessions[sessionId];

    // If they were screensharing, remove that.
    if (nextCurrentCall.screenOn === sessionId) {
        nextCurrentCall.screenOn = '';
    }

    setCurrentCall(nextCurrentCall);
};

export const newCurrentCall = (serverUrl: string, channelId: string, myUserId: string) => {
    let existingCall: Call = DefaultCall;
    const callsState = getCallsState(serverUrl);
    if (callsState.calls[channelId]) {
        existingCall = callsState.calls[channelId];
    }

    setCurrentCall({
        ...DefaultCurrentCall,
        ...existingCall,
        serverUrl,
        channelId,
        myUserId,
    });
};

export const myselfLeftCall = () => {
    setCurrentCall(null);

    // Remove the call screen, and in some situations it needs to be removed twice before actually being removed.
    Navigation.pop(Screens.CALL).catch(() => null);
    Navigation.pop(Screens.CALL).catch(() => null);
};

export const callStarted = async (serverUrl: string, call: Call) => {
    const callsState = getCallsState(serverUrl);
    const nextCalls = {...callsState.calls};
    nextCalls[call.channelId] = call;
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    await processIncomingCalls(serverUrl, [call]);

    const nextChannelsWithCalls = {...getChannelsWithCalls(serverUrl), [call.channelId]: true};
    setChannelsWithCalls(serverUrl, nextChannelsWithCalls);

    // If we started a call, we will get a callStarted event with the 'official' data from the server.
    // Save that in our currentCall.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== call.channelId) {
        return;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        ...call,
    };
    setCurrentCall(nextCurrentCall);

    // We started the call, and it succeeded, so follow the call thread.
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    // Make sure the post/thread has arrived from the server.
    const thread = await getThreadById(database, call.threadId);
    if (thread && !thread.isFollowing) {
        const channel = await getChannelById(database, call.channelId);
        updateThreadFollowing(serverUrl, channel?.teamId || '', call.threadId, true, false);
    }
};

export const callEnded = (serverUrl: string, channelId: string) => {
    const callsState = getCallsState(serverUrl);
    const nextCalls = {...callsState.calls};
    const callId = nextCalls[channelId]?.id || '';
    delete nextCalls[channelId];
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    const channelsWithCalls = getChannelsWithCalls(serverUrl);
    const nextChannelsWithCalls = {...channelsWithCalls};
    delete nextChannelsWithCalls[channelId];
    setChannelsWithCalls(serverUrl, nextChannelsWithCalls);

    removeIncomingCall(serverUrl, callId, channelId);

    // currentCall is set to null by the disconnect.
};

export const setUserMuted = (serverUrl: string, channelId: string, sessionId: string, muted: boolean) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId] || !callsState.calls[channelId].sessions[sessionId]) {
        return;
    }

    const nextUser = {...callsState.calls[channelId].sessions[sessionId], muted};
    const nextCall = {
        ...callsState.calls[channelId],
        sessions: {...callsState.calls[channelId].sessions},
    };
    nextCall.sessions[sessionId] = nextUser;
    const nextCalls = {...callsState.calls};
    nextCalls[channelId] = nextCall;
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Was it the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextCurrentCall = {
        ...currentCall,
        sessions: {
            ...currentCall.sessions,
            [sessionId]: {...currentCall.sessions[sessionId], muted},
        },
    };
    setCurrentCall(nextCurrentCall);
};

export const setUserVoiceOn = (channelId: string, sessionId: string, voiceOn: boolean) => {
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextVoiceOn = {...currentCall.voiceOn};
    if (voiceOn) {
        nextVoiceOn[sessionId] = true;
    } else {
        delete nextVoiceOn[sessionId];
    }

    const nextCurrentCall = {
        ...currentCall,
        voiceOn: nextVoiceOn,
    };
    setCurrentCall(nextCurrentCall);
};

export const setRaisedHand = (serverUrl: string, channelId: string, sessionId: string, timestamp: number) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId] || !callsState.calls[channelId].sessions[sessionId]) {
        return;
    }

    const nextUser = {...callsState.calls[channelId].sessions[sessionId], raisedHand: timestamp};
    const nextCall = {
        ...callsState.calls[channelId],
        sessions: {...callsState.calls[channelId].sessions},
    };
    nextCall.sessions[sessionId] = nextUser;
    const nextCalls = {...callsState.calls};
    nextCalls[channelId] = nextCall;
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Was it the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextCurrentCall = {
        ...currentCall,
        sessions: {
            ...currentCall.sessions,
            [sessionId]: {...currentCall.sessions[sessionId], raisedHand: timestamp},
        },
    };
    setCurrentCall(nextCurrentCall);
};

export const setCallScreenOn = (serverUrl: string, channelId: string, sessionId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId] || !callsState.calls[channelId].sessions[sessionId]) {
        return;
    }

    const nextCall = {...callsState.calls[channelId], screenOn: sessionId};
    const nextCalls = {...callsState.calls};
    nextCalls[channelId] = nextCall;
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Was it the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextCurrentCall = {
        ...currentCall,
        screenOn: sessionId,
    };
    setCurrentCall(nextCurrentCall);
};

export const setCallScreenOff = (serverUrl: string, channelId: string, sessionId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId] || callsState.calls[channelId].screenOn !== sessionId) {
        return;
    }

    const nextCall = {...callsState.calls[channelId], screenOn: ''};
    const nextCalls = {...callsState.calls};
    nextCalls[channelId] = nextCall;
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Was it the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextCurrentCall = {
        ...currentCall,
        screenOn: '',
    };
    setCurrentCall(nextCurrentCall);
};

export const setChannelEnabled = (serverUrl: string, channelId: string, enabled: boolean) => {
    const callsState = getCallsState(serverUrl);
    const nextEnabled = {...callsState.enabled};
    nextEnabled[channelId] = enabled;
    setCallsState(serverUrl, {...callsState, enabled: nextEnabled});
};

export const setScreenShareURL = (url: string) => {
    const call = getCurrentCall();
    if (call) {
        setCurrentCall({...call, screenShareURL: url});
    }
};

export const setSpeakerPhone = (speakerphoneOn: boolean) => {
    const call = getCurrentCall();
    if (call) {
        setCurrentCall({...call, speakerphoneOn});
    }
};

export const setJoiningChannelId = (joiningChannelId: string | null) => {
    const globalCallsState = getGlobalCallsState();
    setGlobalCallsState({
        ...globalCallsState,
        joiningChannelId,
    });
};

export const setAudioDeviceInfo = (info: AudioDeviceInfo) => {
    const call = getCurrentCall();
    if (call) {
        setCurrentCall({...call, audioDeviceInfo: info});
    }
};

export const setConfig = (serverUrl: string, config: Partial<CallsConfigState>) => {
    const callsConfig = getCallsConfig(serverUrl);
    setCallsConfig(serverUrl, {...callsConfig, ...config});
};

export const setPluginEnabled = (serverUrl: string, pluginEnabled: boolean) => {
    const callsConfig = getCallsConfig(serverUrl);
    setCallsConfig(serverUrl, {...callsConfig, pluginEnabled});
};

export const setMicPermissionsGranted = (granted: boolean) => {
    const globalState = getGlobalCallsState();

    const nextGlobalState = {
        ...globalState,
        micPermissionsGranted: granted,
    };
    setGlobalCallsState(nextGlobalState);
};

export const setMicPermissionsErrorDismissed = () => {
    const currentCall = getCurrentCall();
    if (!currentCall) {
        return;
    }

    const nextCurrentCall = {
        ...currentCall,
        micPermissionsErrorDismissed: true,
    };
    setCurrentCall(nextCurrentCall);
};

export const userReacted = (serverUrl: string, channelId: string, reaction: UserReactionData) => {
    // Note: Simplification for performance:
    //  If you are not in the call with the reaction, ignore it. There could be many calls ongoing in your
    //  servers, do we want to be tracking reactions and setting timeouts for all those calls? No.
    //  The downside of this approach: when you join/rejoin a call, you will not see the current reactions.
    //  When you leave a call, you will lose the reactions you were tracking.
    //  We can revisit this if it causes UX issues.
    const currentCall = getCurrentCall();
    if (currentCall?.channelId !== channelId) {
        return;
    }

    // Update the reaction stream.
    const newReactionStream = [...currentCall.reactionStream];
    const idx = newReactionStream.findIndex((e) => e.name === reaction.emoji.name);
    if (idx > -1) {
        const [newReaction] = newReactionStream.splice(idx, 1);
        newReaction.count += 1;
        newReaction.latestTimestamp = reaction.timestamp;
        newReactionStream.splice(0, 0, newReaction);
    } else {
        const newReaction: ReactionStreamEmoji = {
            name: reaction.emoji.name,
            literal: reaction.emoji.literal,
            count: 1,
            latestTimestamp: reaction.timestamp,
        };
        newReactionStream.splice(0, 0, newReaction);
    }
    if (newReactionStream.length > Calls.REACTION_LIMIT) {
        newReactionStream.pop();
    }

    // Update the participant.
    const nextSessions = {...currentCall.sessions};
    if (nextSessions[reaction.session_id]) {
        const nextUser = {...nextSessions[reaction.session_id], reaction};
        nextSessions[reaction.session_id] = nextUser;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        reactionStream: newReactionStream,
        sessions: nextSessions,
    };
    setCurrentCall(nextCurrentCall);

    setTimeout(() => {
        userReactionTimeout(serverUrl, channelId, reaction);
    }, Calls.REACTION_TIMEOUT);
};

const userReactionTimeout = (serverUrl: string, channelId: string, reaction: UserReactionData) => {
    const currentCall = getCurrentCall();
    if (currentCall?.channelId !== channelId) {
        return;
    }

    // Remove the reaction only if it was the last time that emoji was used.
    const newReactions = currentCall.reactionStream.filter((e) => e.latestTimestamp !== reaction.timestamp);

    const nextSessions = {...currentCall.sessions};
    if (nextSessions[reaction.session_id] && nextSessions[reaction.session_id].reaction?.timestamp === reaction.timestamp) {
        const nextUser = {...nextSessions[reaction.session_id]};
        delete nextUser.reaction;
        nextSessions[reaction.session_id] = nextUser;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        reactionStream: newReactions,
        sessions: nextSessions,
    };
    setCurrentCall(nextCurrentCall);
};

export const setRecordingState = (serverUrl: string, channelId: string, recState: CallJobState) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]) {
        return;
    }

    const nextCall = {...callsState.calls[channelId], recState};
    const nextCalls = {...callsState.calls, [channelId]: nextCall};
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Was it the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    // If a new call has started, we reset the alert state so it can be showed again.
    if (currentCall.recState && recState.start_at > currentCall.recState.start_at) {
        needsRecordingAlert();
    }

    const nextCurrentCall = {
        ...currentCall,
        recState,
    };
    setCurrentCall(nextCurrentCall);
};

export const setCaptioningState = (serverUrl: string, channelId: string, capState: CallJobState) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]) {
        return;
    }

    const nextCall = {...callsState.calls[channelId], capState};
    const nextCalls = {...callsState.calls, [channelId]: nextCall};
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Was it the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextCurrentCall = {
        ...currentCall,
        capState,
    };
    setCurrentCall(nextCurrentCall);
};

export const setHost = (serverUrl: string, channelId: string, hostId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]) {
        return;
    }

    const nextCall = {...callsState.calls[channelId], hostId};
    const nextCalls = {...callsState.calls, [channelId]: nextCall};
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Was it the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    // If we are the new host we show the alert again.
    if (currentCall.myUserId === hostId) {
        needsRecordingAlert();
    }

    const nextCurrentCall = {
        ...currentCall,
        hostId,
    };
    setCurrentCall(nextCurrentCall);
};

export const processMeanOpinionScore = (mos: number) => {
    const currentCall = getCurrentCall();
    if (!currentCall) {
        return;
    }

    if (mos < mosThreshold) {
        setCallQualityAlert(true);
    } else {
        setCallQualityAlert(false);
    }
};

export const setCallQualityAlert = (setAlert: boolean) => {
    const currentCall = getCurrentCall();
    if (!currentCall) {
        return;
    }

    // Alert is already active, or alert was dismissed and the timeout hasn't passed
    if ((setAlert && currentCall.callQualityAlert) ||
        (setAlert && currentCall.callQualityAlertDismissed + Calls.CALL_QUALITY_RESET_MS > Date.now())) {
        return;
    }

    // Alert is already inactive
    if ((!setAlert && !currentCall.callQualityAlert)) {
        return;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        callQualityAlert: setAlert,
    };
    setCurrentCall(nextCurrentCall);
};

export const setCallQualityAlertDismissed = () => {
    const currentCall = getCurrentCall();
    if (!currentCall) {
        return;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        callQualityAlert: false,
        callQualityAlertDismissed: Date.now(),
    };
    setCurrentCall(nextCurrentCall);
};

export const receivedCaption = (serverUrl: string, captionData: LiveCaptionData) => {
    const channelId = captionData.channel_id;

    // Ignore if we're not in that channel's call.
    const currentCall = getCurrentCall();
    if (currentCall?.channelId !== channelId) {
        return;
    }

    // Add or replace that user's caption.
    const captionId = generateId();
    const nextCaptions = {...currentCall.captions};
    const newCaption: LiveCaptionMobile = {
        captionId,
        sessionId: captionData.session_id,
        userId: captionData.user_id,
        text: captionData.text,
    };
    nextCaptions[captionData.session_id] = newCaption;

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        captions: nextCaptions,
    };
    setCurrentCall(nextCurrentCall);

    setTimeout(() => {
        receivedCaptionTimeout(serverUrl, channelId, newCaption);
    }, Calls.CAPTION_TIMEOUT);
};

const receivedCaptionTimeout = (serverUrl: string, channelId: string, caption: LiveCaptionMobile) => {
    const currentCall = getCurrentCall();
    if (currentCall?.channelId !== channelId) {
        return;
    }

    // Remove the caption only if it hasn't been replaced by a newer one
    if (currentCall.captions[caption.sessionId]?.captionId !== caption.captionId) {
        return;
    }

    const nextCaptions = {...currentCall.captions};
    delete nextCaptions[caption.sessionId];

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        captions: nextCaptions,
    };
    setCurrentCall(nextCurrentCall);
};
