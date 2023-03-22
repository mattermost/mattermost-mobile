// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {needsRecordingAlert} from '@calls/alerts';
import {
    getCallsConfig,
    getCallsState,
    getChannelsWithCalls,
    getCurrentCall,
    getGlobalCallsState,
    setCallsConfig,
    setCallsState,
    setChannelsWithCalls,
    setCurrentCall,
    setGlobalCallsState,
} from '@calls/state';
import {
    Call,
    CallsConfigState,
    ChannelsWithCalls,
    CurrentCall,
    DefaultCall,
    DefaultCurrentCall,
    ReactionStreamEmoji,
} from '@calls/types/calls';
import {REACTION_LIMIT, REACTION_TIMEOUT} from '@constants/calls';

import type {CallRecordingState, UserReactionData} from '@mattermost/calls/lib/types';

export const setCalls = (serverUrl: string, myUserId: string, calls: Dictionary<Call>, enabled: Dictionary<boolean>) => {
    const channelsWithCalls = Object.keys(calls).reduce(
        (accum, next) => {
            accum[next] = true;
            return accum;
        }, {} as ChannelsWithCalls);
    setChannelsWithCalls(serverUrl, channelsWithCalls);

    setCallsState(serverUrl, {myUserId, calls, enabled});

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

export const userJoinedCall = (serverUrl: string, channelId: string, userId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]) {
        return;
    }

    const nextCall = {
        ...callsState.calls[channelId],
        participants: {...callsState.calls[channelId].participants},
    };
    nextCall.participants[userId] = {
        id: userId,
        muted: true,
        raisedHand: 0,
    };
    const nextCalls = {...callsState.calls, [channelId]: nextCall};

    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    // Did the user join the current call? If so, update that too.
    const currentCall = getCurrentCall();
    if (currentCall && currentCall.channelId === channelId) {
        const voiceOn = {...currentCall.voiceOn};
        delete voiceOn[userId];

        const nextCurrentCall = {
            ...currentCall,
            participants: {...currentCall.participants, [userId]: nextCall.participants[userId]},
            voiceOn,
        };

        // If this is the currentUser, that means we've connected to the call we created.
        if (userId === nextCurrentCall.myUserId) {
            nextCurrentCall.connected = true;
        }

        setCurrentCall(nextCurrentCall);
    }
};

export const userLeftCall = (serverUrl: string, channelId: string, userId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]?.participants[userId]) {
        return;
    }

    const nextCall = {
        ...callsState.calls[channelId],
        participants: {...callsState.calls[channelId].participants},
    };
    delete nextCall.participants[userId];

    // If they were screensharing, remove that.
    if (nextCall.screenOn === userId) {
        nextCall.screenOn = '';
    }

    const nextCalls = {...callsState.calls};
    if (Object.keys(nextCall.participants).length === 0) {
        delete nextCalls[channelId];

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

    // Was the user me?
    if (userId === callsState.myUserId) {
        myselfLeftCall();
        return;
    }

    // Clear them from the voice list
    const voiceOn = {...currentCall.voiceOn};
    delete voiceOn[userId];

    const nextCurrentCall = {
        ...currentCall,
        participants: {...currentCall.participants},
        voiceOn,
    };
    delete nextCurrentCall.participants[userId];

    // If they were screensharing, remove that.
    if (nextCurrentCall.screenOn === userId) {
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
};

export const callStarted = (serverUrl: string, call: Call) => {
    const callsState = getCallsState(serverUrl);
    const nextCalls = {...callsState.calls};
    nextCalls[call.channelId] = call;
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

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
};

export const callEnded = (serverUrl: string, channelId: string) => {
    const callsState = getCallsState(serverUrl);
    const nextCalls = {...callsState.calls};
    delete nextCalls[channelId];
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    const channelsWithCalls = getChannelsWithCalls(serverUrl);
    const nextChannelsWithCalls = {...channelsWithCalls};
    delete nextChannelsWithCalls[channelId];
    setChannelsWithCalls(serverUrl, nextChannelsWithCalls);

    // currentCall is set to null by the disconnect.
};

export const setUserMuted = (serverUrl: string, channelId: string, userId: string, muted: boolean) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId] || !callsState.calls[channelId].participants[userId]) {
        return;
    }

    const nextUser = {...callsState.calls[channelId].participants[userId], muted};
    const nextCall = {
        ...callsState.calls[channelId],
        participants: {...callsState.calls[channelId].participants},
    };
    nextCall.participants[userId] = nextUser;
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
        participants: {
            ...currentCall.participants,
            [userId]: {...currentCall.participants[userId], muted},
        },
    };
    setCurrentCall(nextCurrentCall);
};

export const setUserVoiceOn = (channelId: string, userId: string, voiceOn: boolean) => {
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextVoiceOn = {...currentCall.voiceOn};
    if (voiceOn) {
        nextVoiceOn[userId] = true;
    } else {
        delete nextVoiceOn[userId];
    }

    const nextCurrentCall = {
        ...currentCall,
        voiceOn: nextVoiceOn,
    };
    setCurrentCall(nextCurrentCall);
};

export const setRaisedHand = (serverUrl: string, channelId: string, userId: string, timestamp: number) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId] || !callsState.calls[channelId].participants[userId]) {
        return;
    }

    const nextUser = {...callsState.calls[channelId].participants[userId], raisedHand: timestamp};
    const nextCall = {
        ...callsState.calls[channelId],
        participants: {...callsState.calls[channelId].participants},
    };
    nextCall.participants[userId] = nextUser;
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
        participants: {
            ...currentCall.participants,
            [userId]: {...currentCall.participants[userId], raisedHand: timestamp},
        },
    };
    setCurrentCall(nextCurrentCall);
};

export const setCallScreenOn = (serverUrl: string, channelId: string, userId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId] || !callsState.calls[channelId].participants[userId]) {
        return;
    }

    const nextCall = {...callsState.calls[channelId], screenOn: userId};
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
        screenOn: userId,
    };
    setCurrentCall(nextCurrentCall);
};

export const setCallScreenOff = (serverUrl: string, channelId: string) => {
    const callsState = getCallsState(serverUrl);
    if (!callsState.calls[channelId]) {
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
    if (newReactionStream.length > REACTION_LIMIT) {
        newReactionStream.pop();
    }

    // Update the participant.
    const nextParticipants = {...currentCall.participants};
    if (nextParticipants[reaction.user_id]) {
        const nextUser = {...nextParticipants[reaction.user_id], reaction};
        nextParticipants[reaction.user_id] = nextUser;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        reactionStream: newReactionStream,
        participants: nextParticipants,
    };
    setCurrentCall(nextCurrentCall);

    setTimeout(() => {
        userReactionTimeout(serverUrl, channelId, reaction);
    }, REACTION_TIMEOUT);
};

const userReactionTimeout = (serverUrl: string, channelId: string, reaction: UserReactionData) => {
    const currentCall = getCurrentCall();
    if (currentCall?.channelId !== channelId) {
        return;
    }

    // Remove the reaction only if it was the last time that emoji was used.
    const newReactions = currentCall.reactionStream.filter((e) => e.latestTimestamp !== reaction.timestamp);

    const nextParticipants = {...currentCall.participants};
    if (nextParticipants[reaction.user_id] && nextParticipants[reaction.user_id].reaction?.timestamp === reaction.timestamp) {
        const nextUser = {...nextParticipants[reaction.user_id]};
        delete nextUser.reaction;
        nextParticipants[reaction.user_id] = nextUser;
    }

    const nextCurrentCall: CurrentCall = {
        ...currentCall,
        reactionStream: newReactions,
        participants: nextParticipants,
    };
    setCurrentCall(nextCurrentCall);
};

export const setRecordingState = (serverUrl: string, channelId: string, recState: CallRecordingState) => {
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
