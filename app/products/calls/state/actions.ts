// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getCallsConfig,
    getCallsState,
    getChannelsWithCalls,
    getCurrentCall,
    setCallsConfig,
    setCallsState,
    setChannelsWithCalls,
    setCurrentCall,
} from '@calls/state';
import {Call, ChannelsWithCalls, ServerCallsConfig} from '@calls/types/calls';

export const setCalls = (serverUrl: string, myUserId: string, calls: Dictionary<Call>, enabled: Dictionary<boolean>) => {
    const channelsWithCalls = Object.keys(calls).reduce(
        (accum, next) => {
            accum[next] = true;
            return accum;
        }, {} as ChannelsWithCalls);
    setChannelsWithCalls(serverUrl, channelsWithCalls);

    setCallsState(serverUrl, {serverUrl, myUserId, calls, enabled});
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
    if (!currentCall || currentCall.channelId !== channelId) {
        return;
    }

    const nextCall2 = {
        ...currentCall,
        participants: {...currentCall.participants, [userId]: nextCall.participants[userId]},
    };
    setCurrentCall(nextCall2);
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

    const nextCall2 = {
        ...currentCall,
        participants: {...currentCall.participants},
    };
    delete nextCall2.participants[userId];
    setCurrentCall(nextCall2);
};

export const myselfJoinedCall = (serverUrl: string, channelId: string) => {
    const callsState = getCallsState(serverUrl);

    const participants = callsState.calls[channelId]?.participants || {};
    setCurrentCall({
        ...callsState.calls[channelId],
        serverUrl,
        myUserId: callsState.myUserId,
        participants,
        channelId,
        screenShareURL: '',
        speakerphoneOn: false,
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

    // Was it the current call? If so, we started it, and need to fill in the currentCall's details.
    const currentCall = getCurrentCall();
    if (!currentCall || currentCall.channelId !== call.channelId) {
        return;
    }

    const nextCurrentCall = {
        ...currentCall,
        ...call,
    };
    setCurrentCall(nextCurrentCall);
};

// TODO: should be called callEnded to match the ws event. Will fix when callEnded is implemented.
export const callFinished = (serverUrl: string, channelId: string) => {
    const callsState = getCallsState(serverUrl);
    const nextCalls = {...callsState.calls};
    delete nextCalls[channelId];
    setCallsState(serverUrl, {...callsState, calls: nextCalls});

    const channelsWithCalls = getChannelsWithCalls(serverUrl);
    const nextChannelsWithCalls = {...channelsWithCalls};
    delete nextChannelsWithCalls[channelId];
    setChannelsWithCalls(serverUrl, nextChannelsWithCalls);
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

export const setConfig = (serverUrl: string, config: ServerCallsConfig) => {
    const callsConfig = getCallsConfig(serverUrl);
    setCallsConfig(serverUrl, {...callsConfig, ...config});
};

export const setPluginEnabled = (serverUrl: string, pluginEnabled: boolean) => {
    const callsConfig = getCallsConfig(serverUrl);
    setCallsConfig(serverUrl, {...callsConfig, pluginEnabled});
};
