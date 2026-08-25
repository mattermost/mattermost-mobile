// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {mosThreshold} from '@mattermost/calls/lib/rtc_monitor';
import CallsNative from '@mattermost/calls-native';
import {AppState, type AppStateStatus, Platform} from 'react-native';

import {updateThreadFollowing} from '@actions/remote/thread';
import {needsRecordingAlert} from '@calls/alerts';
import {endNativeCall} from '@calls/native_call';
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
    type AudioRoute,
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
import {getDMCalleeId, hasOtherUserJoined} from '@calls/utils';
import {Calls, General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getThreadById} from '@queries/servers/thread';
import {getCurrentUser, getUserById} from '@queries/servers/user';
import {dismissBottomSheet, navigateBack} from '@screens/navigation';
import {NavigationStore} from '@store/navigation_store';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {generateId} from '@utils/general';
import {isMainActivity} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import type {CallJobState, LiveCaptionData, UserReactionData} from '@mattermost/calls/lib/types';
import type UserModel from '@typings/database/models/servers/user';

// Keep our session unmuted until the server confirms mute state (see setUserMuted).
// Prevents showing self as muted briefly when joining or starting a call.
const keepMyMuteState = (call: CurrentCall): CurrentCall => {
    const mySession = call.sessions[call.mySessionId];
    if (!call.startUnmuted || !mySession?.muted) {
        return call;
    }

    return {
        ...call,
        sessions: {...call.sessions, [call.mySessionId]: {...mySession, muted: false}},
    };
};

export const setCalls = async (serverUrl: string, myUserId: string, calls: Dictionary<Call>, enabled: Dictionary<boolean>) => {
    // Reconcile native overlays: any previously-tracked call that's no longer
    // in the authoritative server snapshot has ended (typically because we
    // missed its call_end event while the WS was disconnected). End the
    // CallKit overlay so the user isn't stuck on a phantom ringing screen.
    const previousCalls = getCallsState(serverUrl).calls;
    for (const channelId of Object.keys(previousCalls)) {
        if (!calls[channelId]) {
            endNativeCall(serverUrl, channelId, 'remoteEnded');
        }
    }

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
    const nextCall = keepMyMuteState({
        ...currentCall,
        ...calls[currentCall.channelId],
        voiceOn: {},
    });
    setCurrentCall(nextCall);
    stopRingbackIfAnswered(nextCall);
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

    setIncomingCalls({...getIncomingCalls(), incomingCalls: newIncoming});
};

export const getChannelIdFromCallId = (serverUrl: string, callId: string) => {
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

    stopIncomingCallsRinging();

    const incomingCalls = getIncomingCalls();
    const newIncomingCalls = incomingCalls.incomingCalls.filter((ic) => ic.callID !== callId);
    if (incomingCalls.incomingCalls.length !== newIncomingCalls.length) {
        setIncomingCalls({...incomingCalls, incomingCalls: newIncomingCalls});
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

let previousAppState: AppStateStatus;

export const callsOnAppStateChange = async (appState: AppStateStatus) => {
    if (appState === previousAppState || !isMainActivity()) {
        return;
    }

    previousAppState = appState;
    switch (appState) {
        case 'inactive':
        case 'background':
            // The outbound ringback belongs to a call the user placed and is still in, so on iOS it
            // keeps playing until the callee answers or RINGBACK_TONE_TIMEOUT expires it —
            // backgrounding the app shouldn't leave the caller in silence with no cue that the call
            // was picked up. On Android the inbound ring and the ringback share the one native
            // player, so that one has to stop.
            if (Platform.OS !== 'ios') {
                stopRingback();
            }
            stopIncomingCallsRinging();
            break;
    }
};

// Whether the user wants a sound when a call comes in ("Notification sound for incoming calls" in
// Settings). Absent on users who have never opened that screen, which reads as off. Deliberately
// not applied to the outbound ringback: that's progress feedback for a call you just placed, not a
// notification about someone else's.
const callSoundsEnabled = (user: UserModel) => {
    return user.notifyProps?.calls_mobile_sound ? user.notifyProps.calls_mobile_sound === 'true' : user.notifyProps?.calls_desktop_sound === 'true';
};

const getRingtoneOrNone = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const user = await getCurrentUser(database);

        // A missing user shouldn't happen; treat it as sounds-off rather than alerting.
        if (!user || !callSoundsEnabled(user)) {
            return 'none';
        }

        let tone = user.notifyProps?.calls_mobile_notification_sound ? user.notifyProps.calls_mobile_notification_sound : user.notifyProps?.calls_notification_sound;
        if (!tone) {
            tone = Calls.RINGTONE_DEFAULT;
        }
        return 'calls_' + tone.toLowerCase();
    } catch (error) {
        logError('failed to getServerDatabase in getRingtoneOrNone', error);
        return 'none';
    }
};

const shouldRing = (callId: string, userStatus: string) => {
    // Do not ring if we are in the background
    if (AppState.currentState !== 'active' || userStatus === General.DND || userStatus === General.OUT_OF_OFFICE) {
        return false;
    }

    // Do not ring if we are already ringing, or we have no incoming calls, or we have rung for this call already
    const incomingCalls = getIncomingCalls();
    if (incomingCalls.currentRingingCallId || incomingCalls.incomingCalls.length === 0 || incomingCalls.callIdHasRung[callId]) {
        return false;
    }

    // Do not ring if we are in a call
    const currentCall = getCurrentCall();
    return !currentCall;
};

export const playIncomingCallsRinging = async (serverUrl: string, callId: string, userStatus: string) => {
    if (!shouldRing(callId, userStatus)) {
        return;
    }

    // On iOS, CallKit always handles the ringtone for incoming calls (including
    // when the app is foregrounded). Playing a second ringtone via startRingtone
    // would overlap with the CallKit ring at a different volume.
    if (Platform.OS === 'ios') {
        return;
    }

    const ringTone = await getRingtoneOrNone(serverUrl);
    if (ringTone === 'none') {
        return;
    }
    const incomingCalls = getIncomingCalls();
    setIncomingCalls({
        ...incomingCalls,
        currentRingingCallId: callId,
        callIdHasRung: {...incomingCalls.callIdHasRung, [callId]: true},
    });
    CallsNative.startRingtone(ringTone, Calls.RING_LENGTH / 1000, false);

    setTimeout(() => {
        const incoming = getIncomingCalls();
        if (incoming.currentRingingCallId === callId) {
            CallsNative.stopRingtone();
            setIncomingCalls({...getIncomingCalls(), currentRingingCallId: undefined});
        }
    }, Calls.RING_LENGTH);
};

const stopIncomingCallsRinging = () => {
    const incomingCalls = getIncomingCalls();
    if (!incomingCalls.currentRingingCallId) {
        return;
    }

    CallsNative.stopRingtone();
    setIncomingCalls({...incomingCalls, currentRingingCallId: undefined});
};

// The channel currently playing the ringback tone, or null if none is playing.
let ringbackChannelId: string | null = null;
let ringbackTimeout: ReturnType<typeof setTimeout> | null = null;

// When the local call attempt began, on the device clock, used to expire the tone on the same
// schedule as the callee's ring. Deliberately not derived from currentCall.startTime: that's the
// server's start_at, and subtracting it from Date.now() makes the window collapse to nothing
// whenever the device clock runs ahead of the server's.
let ringbackWindowStartedAt = 0;

export const stopRingback = () => {
    if (ringbackTimeout) {
        clearTimeout(ringbackTimeout);
        ringbackTimeout = null;
    }
    if (ringbackChannelId !== null) {
        CallsNative.stopRingtone();
        ringbackChannelId = null;
    }
};

const stopRingbackIfAnswered = (call: CurrentCall) => {
    if (hasOtherUserJoined(call.sessions, call.myUserId)) {
        stopRingback();
    }
};

// The caller is in the ringing phase while they own a connected DM call that nobody else has
// joined or answered yet.
const isRingingPhase = (call: CurrentCall) => {
    return call.connected &&
        call.ownerId === call.myUserId &&
        !call.dmCalleeAnsweredAt &&
        !hasOtherUserJoined(call.sessions, call.myUserId);
};

export const startRingbackIfNeeded = async (currentCall: CurrentCall) => {
    const {channelId, serverUrl} = currentCall;
    if (ringbackChannelId === channelId || !isRingingPhase(currentCall)) {
        return;
    }

    if (!getCallsConfig(serverUrl).EnableRinging) {
        return;
    }

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channel = await getChannelById(database, channelId);
        if (!getDMCalleeId(currentCall.myUserId, channel)) {
            return;
        }
    } catch (error: unknown) {
        logError('startRingbackIfNeeded', getFullErrorMessage(error));
        return;
    }

    // Re-check nothing changed while we were awaiting the channel lookup.
    const latestCall = getCurrentCall();
    if (
        !latestCall ||
        latestCall.channelId !== channelId ||
        ringbackChannelId === channelId ||
        !isRingingPhase(latestCall)
    ) {
        return;
    }

    // The callee's phone rings from the moment the call is placed, so the tone gets the remainder
    // of that window rather than a full timeout from whenever the media connection came up. Once
    // the window is gone there's nothing left to play.
    const remaining = Calls.RINGBACK_TONE_TIMEOUT - (Date.now() - ringbackWindowStartedAt);
    if (remaining <= 0) {
        return;
    }

    ringbackChannelId = channelId;

    // seconds=0 loops the 'ringback' asset indefinitely on Android; iOS ignores the argument
    // and always loops. Either way the timeout below is what stops it. isRingback keeps Android
    // from vibrating the caller's own phone and puts the tone on the call's audio route.
    CallsNative.startRingtone('ringback', 0, true).catch((error: unknown) => {
        logDebug('startRingbackIfNeeded failed to start the ringback tone', getFullErrorMessage(error));
        if (ringbackChannelId === channelId) {
            stopRingback();
        }
    });

    // stopRingback() clears this on the normal path, but a second call reaching here without one
    // in between would orphan the pending timeout and stop the new tone early.
    if (ringbackTimeout) {
        clearTimeout(ringbackTimeout);
    }
    ringbackTimeout = setTimeout(stopRingback, remaining);
};

export const setCallForChannel = (serverUrl: string, channelId: string, call?: Call, enabled?: boolean) => {
    const callsState = getCallsState(serverUrl);
    let nextEnabled = callsState.enabled;
    if (typeof enabled !== 'undefined') {
        nextEnabled = {...callsState.enabled, [channelId]: enabled};
    }

    let nextCalls = callsState.calls;
    if (call) {
        nextCalls = {...callsState.calls};
        nextCalls[channelId] = call;

        // In case we got a complete update on the currentCall
        const currentCall = getCurrentCall();
        if (currentCall?.channelId === channelId) {
            const nextCurrentCall = keepMyMuteState({
                ...currentCall,
                ...call,
            });
            setCurrentCall(nextCurrentCall);
            stopRingbackIfAnswered(nextCurrentCall);
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

        let nextCurrentCall = {
            ...currentCall,
            sessions: {...currentCall.sessions, [sessionId]: nextCall.sessions[sessionId]},
            voiceOn,
        };

        // If this is the currentUser, that means we've connected to the call we created.
        if (userId === nextCurrentCall.myUserId && !nextCurrentCall.connected) {
            nextCurrentCall.connected = true;
            nextCurrentCall.mySessionId = sessionId;
        }

        // Set for every call type rather than plumbing the channel type down this synchronous event
        // path: the field is only ever read behind isDMCall (see observeDMCallingState).
        if (
            !nextCurrentCall.dmCalleeAnsweredAt &&
            hasOtherUserJoined(nextCurrentCall.sessions, nextCurrentCall.myUserId)) {
            nextCurrentCall.dmCalleeAnsweredAt = Date.now();
        }

        nextCurrentCall = keepMyMuteState(nextCurrentCall);
        setCurrentCall(nextCurrentCall);

        if (userId === nextCurrentCall.myUserId) {
            startRingbackIfNeeded(nextCurrentCall);
        } else {
            stopRingbackIfAnswered(nextCurrentCall);
        }
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
        endNativeCall(serverUrl, channelId, 'remoteEnded');

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

export const newCurrentCall = (serverUrl: string, channelId: string, myUserId: string, {startedByMe = false, startUnmuted = false} = {}) => {
    let existingCall: Call = DefaultCall;
    const callsState = getCallsState(serverUrl);
    if (callsState.calls[channelId]) {
        existingCall = callsState.calls[channelId];
    }

    // A call we placed stays ours even if it turns out we were joining after all, because the other
    // party got in first between the tap and here. Otherwise the call view, which is already open on
    // the strength of that flag, would blank until our session arrives.
    const previousCall = getCurrentCall();
    const iPlacedThisCall = startedByMe || Boolean(
        previousCall?.startedByMe &&
        previousCall.serverUrl === serverUrl &&
        previousCall.channelId === channelId,
    );

    // Silence any tone left over from a previous call, and open this call's ringback window: the
    // callee starts ringing off the back of this attempt, so it's the anchor the tone expires on.
    stopRingback();
    ringbackWindowStartedAt = Date.now();

    setCurrentCall({
        ...DefaultCurrentCall,
        ...existingCall,
        serverUrl,
        channelId,
        myUserId,
        startedByMe: iPlacedThisCall,
        startUnmuted,

        // Whoever starts a call hosts it, so say so now rather than letting the host badge drop in
        // on the participant card when call_start arrives with the same answer.
        hostId: startedByMe && !existingCall.hostId ? myUserId : existingCall.hostId,
    });
};

// Seeds the current call the instant the user taps the call button, before any of the connecting
// work has run, so the full-screen call view can be opened right away and render its 'Connecting'
// state. joinCall seeds it again with the same values once it has the user from the database.
// Only used for 1:1 DM calls, which are placed live, hence startUnmuted.
export const startOutgoingCall = (serverUrl: string, channelId: string) => {
    const {myUserId} = getCallsState(serverUrl);
    if (!myUserId) {
        // Nothing to seed the callee lookup with; leave the current call for joinCall to create.
        logDebug('calls: startOutgoingCall has no myUserId for serverUrl', serverUrl);
        return;
    }

    newCurrentCall(serverUrl, channelId, myUserId, {startedByMe: true, startUnmuted: true});
};

// Stops standing in for our own mute state, leaving whatever the server last said. Used when the
// unmute we were counting on never made it off the device, so that we don't keep showing ourselves
// live indefinitely.
export const clearStartUnmuted = () => {
    const currentCall = getCurrentCall();
    if (!currentCall?.startUnmuted) {
        return;
    }

    setCurrentCall({...currentCall, startUnmuted: false});
};

// Tears down an outgoing call that never connected, e.g. calls turned out to be disabled or the
// connection failed. Leaves a connected call alone: by then it's the connection's to end.
export const cancelOutgoingCall = async (serverUrl: string, channelId: string) => {
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.serverUrl !== serverUrl || currentCall.channelId !== channelId || currentCall.connected) {
        return;
    }

    await myselfLeftCall();
};

export const setCurrentCallConnected = (channelId: string, sessionId: string) => {
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        connected: true,
        mySessionId: sessionId,
    };
    setCurrentCall(nextCurrentCall);
    startRingbackIfNeeded(nextCurrentCall);
};

export const myselfLeftCall = async () => {
    stopRingback();
    setCurrentCall(null);

    if (NavigationStore.isScreenInStack(Screens.CALL)) {
        await dismissBottomSheet();
        navigateBack();
    }
};

export const callStarted = async (serverUrl: string, call: Call) => {
    const callsState = getCallsState(serverUrl);
    const nextCalls = {...callsState.calls};

    // Same as for the current call below: the event says nothing about who is in the call, so it
    // must not take the sessions we already know about with it.
    const knownSessions = callsState.calls[call.channelId]?.sessions;
    nextCalls[call.channelId] = {
        ...call,
        sessions: Object.keys(call.sessions).length ? call.sessions : (knownSessions ?? call.sessions),
    };
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

    const nextCurrentCall: CurrentCall = keepMyMuteState({
        ...currentCall,
        ...call,

        // The call_start event carries no session list, so it has nothing to say about who is in
        // the call: spreading its empty dictionary would drop everyone we already know about.
        sessions: Object.keys(call.sessions).length ? call.sessions : currentCall.sessions,
    });
    setCurrentCall(nextCurrentCall);

    // This is the first point at which ownerId is correct for the person who started the call:
    // newCurrentCall seeds it from DefaultCall ('') when the channel had no call yet. Ringback
    // has to be (re)evaluated here or the initiator never hears it. Idempotent with the other
    // call sites, so whichever websocket event arrives first wins.
    stopRingbackIfAnswered(nextCurrentCall);
    startRingbackIfNeeded(nextCurrentCall);

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

        // The server has now told us where our own mic stands, so stop standing in for it.
        startUnmuted: sessionId === currentCall.mySessionId ? false : currentCall.startUnmuted,
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

export const setJoiningChannelId = (joiningChannelId: string | null) => {
    const globalCallsState = getGlobalCallsState();
    setGlobalCallsState({
        ...globalCallsState,
        joiningChannelId,
    });
};

export const setAudioDeviceInfo = (info: AudioRoute) => {
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
