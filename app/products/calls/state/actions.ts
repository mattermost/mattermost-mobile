// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
import {Call, CallsConfig, ChannelsWithCalls, DefaultCall, DefaultCurrentCall} from '@calls/types/calls';

export const setCalls = (serverUrl: string, myUserId: string, calls: Dictionary<Call>, enabled: Dictionary<boolean>) => {
    const channelsWithCalls = Object.keys(calls).reduce(
        (accum, next) => {
            accum[next] = true;
            return accum;
        }, {} as ChannelsWithCalls);
    setChannelsWithCalls(serverUrl, channelsWithCalls);

    setCallsState(serverUrl, {serverUrl, myUserId, calls, enabled});

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

export const setCallForChannel = (serverUrl: string, channelId: string, enabled: boolean, call?: Call) => {
    const callsState = getCallsState(serverUrl);
    const nextEnabled = {...callsState.enabled, [channelId]: enabled};

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

    const nextCurrentCall = {
        ...currentCall,
        startTime: call.startTime,
        threadId: call.threadId,
        ownerId: call.ownerId,
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

export const setConfig = (serverUrl: string, config: Partial<CallsConfig>) => {
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
