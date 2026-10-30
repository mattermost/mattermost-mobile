// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {mediaDevices} from '@livekit/react-native-webrtc';
import {DisconnectReason, LocalAudioTrack, Room, RoomEvent} from 'livekit-client';
import {Platform} from 'react-native';

import {fetchMissingProfilesByIds} from '@actions/remote/user';
import {livekitConnectTimeout, peerConnectTimeout} from '@calls/connection/constants';
import {createAudioRouteManager, stopAudioSession} from '@calls/connection/session/audio';
import {hostRemovedErr} from '@calls/errors';
import {
    clearStartUnmuted,
    getCurrentCall,
    setCallForChannel,
    setCallQualityAlert,
    setCaptioningState,
    setHost,
    setRaisedHand,
    setRecordingState,
    setUserMuted,
    setUserVoiceOn,
    userJoinedCall,
    userLeftCall,
    userReacted,
} from '@calls/state';
import {DefaultCurrentCall} from '@calls/types/calls';
import Calls from '@constants/calls';
import NetworkManager from '@managers/network_manager';
import {advanceTimers, enableFakeTimers, disableFakeTimers} from '@test/timer_helpers';
import {logError} from '@utils/log';

import {newLiveKitConnection} from './connection';

import type {CallState} from '@mattermost/calls/lib/types';

jest.mock('@actions/remote/user', () => ({
    fetchMissingProfilesByIds: jest.fn(),
}));
jest.mock('@calls/state', () => ({
    clearStartUnmuted: jest.fn(),
    getCurrentCall: jest.fn(),
    setCallForChannel: jest.fn(),
    setCallQualityAlert: jest.fn(),
    setCaptioningState: jest.fn(),
    setHost: jest.fn(),
    setRaisedHand: jest.fn(),
    setRecordingState: jest.fn(),
    setUserMuted: jest.fn(),
    setUserVoiceOn: jest.fn(),
    userJoinedCall: jest.fn(),
    userLeftCall: jest.fn(),
    userReacted: jest.fn(),
}));
jest.mock('@calls/connection/session/foreground_service', () => ({
    foregroundServiceStart: jest.fn(),
    foregroundServiceStop: jest.fn(),
}));
jest.mock('@calls/connection/session/audio', () => ({
    startAudioSession: jest.fn(() => Promise.resolve()),
    stopAudioSession: jest.fn(() => Promise.resolve()),
    createAudioRouteManager: jest.fn(() => mockAudioRouteManager),
}));

const mockAudioRouteManager = {
    setUserSelectedAudioRoute: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(),
};

const SERVER_URL = 'http://localhost:8065';
const CHANNEL_ID = 'channelID';
const SESSION_ID = 'mysession';
const LIVEKIT_URL = 'wss://livekit.example.com';
const LIVEKIT_TOKEN = 'jwt-token';

const recording = {type: 'recording', init_at: 100, start_at: 200, end_at: 0};
const liveCaptions = {type: 'captions', init_at: 100, start_at: 200, end_at: 0};

const callState: CallState = {
    id: 'call-id',
    start_at: 100,
    sessions: [
        {session_id: SESSION_ID, user_id: 'myuser', unmuted: false, raised_hand: 0},
        {session_id: 'sessionA', user_id: 'userA', unmuted: true, raised_hand: 0},
    ],
    thread_id: 'thread-id',
    post_id: 'post-id',
    screen_sharing_session_id: '',
    owner_id: 'userA',
    host_id: 'userA',
    recording,
    live_captions: liveCaptions,
};

// Builds a participant the way LiveKit exposes one: identity carries userID___sessionID,
// mute state lives on the microphone publication, raised hand on attributes.
const participant = (userID: string, sessionID: string, opts: {muted?: boolean; raisedHand?: string; bot?: boolean} = {}) => ({
    identity: `${userID}___${sessionID}`,
    attributes: {
        ...(opts.raisedHand === undefined ? {} : {raised_hand: opts.raisedHand}),
        ...(opts.bot ? {bot: 'true'} : {}),
    },
    getTrackPublication: jest.fn(() => (opts.muted === undefined ? undefined : {isMuted: opts.muted})),
});

type MicTrack = {source?: string; isMuted: boolean; mute: jest.Mock; unmute: jest.Mock; stop: jest.Mock};

describe('newLiveKitConnection', () => {
    const mockClient = {
        createLiveKitSession: jest.fn(),
    };

    const mockIntl = {formatMessage: jest.fn((m) => m.defaultMessage)} as unknown as import('react-intl').IntlShape;

    let roomHandlers: Record<string, any>;
    let mockRoom: any;
    let micPublication: {track: MicTrack} | undefined;
    let micTrack: MicTrack | undefined;

    const connect = async (remoteParticipants: any[] = [], closeCb: (err?: Error) => void = () => {}, hasMicPermission = false) => {
        mockRoom.remoteParticipants = new Map(remoteParticipants.map((p) => [p.identity, p]));

        const connection = await newLiveKitConnection(
            SERVER_URL, CHANNEL_ID, closeCb, () => {}, hasMicPermission, mockIntl, 'title', 'root-id',
        );
        await connection.waitForPeerConnection();
        return connection;
    };

    beforeAll(() => {
        // @ts-ignore
        NetworkManager.getClient = jest.fn(() => mockClient);
        Platform.OS = 'android';
    });

    beforeEach(() => {
        jest.clearAllMocks();
        enableFakeTimers();

        mockClient.createLiveKitSession.mockResolvedValue({
            session_id: SESSION_ID,
            token: LIVEKIT_TOKEN,
            url: LIVEKIT_URL,
            call_state: callState,
        });
        jest.mocked(getCurrentCall).mockReturnValue({...DefaultCurrentCall, channelId: CHANNEL_ID});

        roomHandlers = {};
        micPublication = undefined;
        micTrack = undefined;
        mockRoom = {
            on: jest.fn((event: string, handler: any) => {
                roomHandlers[event] = handler;
                return mockRoom;
            }),
            prepareConnection: jest.fn(() => Promise.resolve()),
            connect: jest.fn(() => {
                // The real Room emits Connected off the back of a successful connect().
                roomHandlers[RoomEvent.Connected]?.();
                return Promise.resolve();
            }),
            disconnect: jest.fn(() => Promise.resolve()),
            metadata: undefined,
            remoteParticipants: new Map(),
            localParticipant: {
                identity: `myuser___${SESSION_ID}`,
                attributes: {},
                getTrackPublication: jest.fn(() => micPublication),
                publishTrack: jest.fn((track: MicTrack) => {
                    micPublication = {track};

                    // The real Room reports the publish, carrying the track's mute state at the time.
                    roomHandlers[RoomEvent.LocalTrackPublished]?.({source: track.source, isMuted: track.isMuted, track}, mockRoom.localParticipant);
                    return Promise.resolve(micPublication);
                }),
                setAttributes: jest.fn(() => Promise.resolve()),
                publishData: jest.fn(() => Promise.resolve()),
            },
        };
        (Room as unknown as jest.Mock).mockImplementation(() => mockRoom);
        (LocalAudioTrack as unknown as jest.Mock).mockImplementation(() => {
            const track: MicTrack = {
                source: undefined,
                isMuted: false,
                mute: jest.fn(async () => {
                    track.isMuted = true;
                }),
                unmute: jest.fn(async () => {
                    track.isMuted = false;
                }),
                stop: jest.fn(),
            };
            micTrack = track;
            return track;
        });
    });

    afterEach(() => {
        disableFakeTimers();
    });

    it('should post the channel, title and thread and connect the room with the returned url and token', async () => {
        await connect();

        expect(mockClient.createLiveKitSession).toHaveBeenCalledWith(CHANNEL_ID, 'title', 'root-id');
        expect(mockRoom.connect).toHaveBeenCalledWith(LIVEKIT_URL, LIVEKIT_TOKEN);
    });

    it('should resolve waitForPeerConnection with the session id from the join response', async () => {
        mockClient.createLiveKitSession.mockResolvedValue({session_id: 'minted-session', token: LIVEKIT_TOKEN, url: LIVEKIT_URL, call_state: callState});

        const connection = await newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, false, mockIntl);

        await expect(connection.waitForPeerConnection()).resolves.toBe('minted-session');
    });

    it('should keep waiting for the room past the rtcd peer timeout and reject once the livekit timeout passes', async () => {
        mockRoom.connect.mockReturnValue(new Promise(() => {}));
        const connection = await newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, false, mockIntl);
        const settled = jest.fn();
        connection.waitForPeerConnection().catch(settled);

        await advanceTimers(peerConnectTimeout + 1);
        expect(settled).not.toHaveBeenCalled();

        await advanceTimers(livekitConnectTimeout);
        expect(settled).toHaveBeenCalledWith(new Error('timed out waiting for peer connection'));
    });

    it('should stop the audio session and reject when the join request fails', async () => {
        const joinError = new Error('join failed');
        mockClient.createLiveKitSession.mockRejectedValue(joinError);

        await expect(newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, false, mockIntl)).rejects.toBe(joinError);
        expect(stopAudioSession).toHaveBeenCalled();
    });

    it('should seed the channel call with the other sessions from the join response, leaving ours to the room', async () => {
        mockClient.createLiveKitSession.mockResolvedValue({
            session_id: SESSION_ID,
            token: LIVEKIT_TOKEN,
            url: LIVEKIT_URL,
            call_state: {
                ...callState,
                sessions: [...callState.sessions, {session_id: 'sessionB', user_id: 'userB', unmuted: false, raised_hand: 0}],
            },
        });

        await connect([participant('userA', 'sessionA'), participant('userB', 'sessionB')]);

        expect(jest.mocked(setCallForChannel).mock.calls[0]).toEqual([SERVER_URL, CHANNEL_ID, expect.objectContaining({
            id: 'call-id',
            hostId: 'userA',
            sessions: {
                sessionA: {userId: 'userA', sessionId: 'sessionA', muted: false, raisedHand: 0},
                sessionB: {userId: 'userB', sessionId: 'sessionB', muted: true, raisedHand: 0},
            },
        })]);
        expect(jest.mocked(fetchMissingProfilesByIds).mock.calls[0]).toEqual([SERVER_URL, ['userA', 'userB']]);
        expect(setRecordingState).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, recording);
        expect(setCaptioningState).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, liveCaptions);
    });

    it('should re-seed the call with only the sessions the room confirmed once connected, without ending it through userLeftCall', async () => {
        mockClient.createLiveKitSession.mockResolvedValue({
            session_id: SESSION_ID,
            token: LIVEKIT_TOKEN,
            url: LIVEKIT_URL,
            call_state: {
                ...callState,
                sessions: [...callState.sessions, {session_id: 'pendingSession', user_id: 'userB', unmuted: false, raised_hand: 0}],
            },
        });

        await connect([participant('userA', 'sessionA')]);

        expect(jest.mocked(setCallForChannel).mock.lastCall).toEqual([SERVER_URL, CHANNEL_ID, expect.objectContaining({
            sessions: {sessionA: {userId: 'userA', sessionId: 'sessionA', muted: false, raisedHand: 0}},
        })]);
        expect(userLeftCall).not.toHaveBeenCalled();
    });

    it('should drop stale join response sessions before adding our own, so an unconnected callee does not mark the call answered', async () => {
        mockClient.createLiveKitSession.mockResolvedValue({
            session_id: SESSION_ID,
            token: LIVEKIT_TOKEN,
            url: LIVEKIT_URL,
            call_state: {
                ...callState,
                sessions: [
                    {session_id: SESSION_ID, user_id: 'myuser', unmuted: false, raised_hand: 0},
                    {session_id: 'pendingSession', user_id: 'userB', unmuted: false, raised_hand: 0},
                ],
            },
        });

        await connect();

        const [, reseedOrder] = jest.mocked(setCallForChannel).mock.invocationCallOrder;
        const [joinedOrder] = jest.mocked(userJoinedCall).mock.invocationCallOrder;
        expect(reseedOrder).toBeLessThan(joinedOrder);
    });

    it('should populate the roster from participants present at connect and those joining later, excluding bots', async () => {
        await connect([
            participant('userA', 'sessionA'),
            participant('botuser', 'botsession', {bot: true}),
        ]);

        roomHandlers[RoomEvent.ParticipantConnected](participant('userC', 'sessionC'));
        roomHandlers[RoomEvent.ParticipantConnected](participant('botuser', 'botsession2', {bot: true}));

        expect(jest.mocked(userJoinedCall).mock.calls).toEqual([
            [SERVER_URL, CHANNEL_ID, 'myuser', SESSION_ID],
            [SERVER_URL, CHANNEL_ID, 'userA', 'sessionA'],
            [SERVER_URL, CHANNEL_ID, 'userC', 'sessionC'],
        ]);
        expect(jest.mocked(fetchMissingProfilesByIds).mock.calls).toEqual([
            [SERVER_URL, ['userA']],
            [SERVER_URL, ['myuser', 'userA']],
            [SERVER_URL, ['userC']],
        ]);
        expect(setUserMuted).not.toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'botsession', expect.anything());
    });

    it('should remove the session of a participant leaving the room', async () => {
        await connect();

        roomHandlers[RoomEvent.ParticipantDisconnected](participant('userA', 'sessionA'));

        expect(userLeftCall).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'sessionA');
    });

    it('should set host, recording and captions state from room metadata on connect and on change', async () => {
        mockRoom.metadata = JSON.stringify({host_id: 'hostA', recording});
        await connect();

        expect(setHost).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'hostA');
        expect(setRecordingState).toHaveBeenLastCalledWith(SERVER_URL, CHANNEL_ID, recording);

        roomHandlers[RoomEvent.RoomMetadataChanged](JSON.stringify({host_id: 'hostB', live_captions: liveCaptions}));

        expect(setHost).toHaveBeenLastCalledWith(SERVER_URL, CHANNEL_ID, 'hostB');
        expect(setCaptioningState).toHaveBeenLastCalledWith(SERVER_URL, CHANNEL_ID, liveCaptions);
    });

    it('should not re-set an unchanged host from room metadata', async () => {
        jest.mocked(getCurrentCall).mockReturnValue({...DefaultCurrentCall, channelId: CHANNEL_ID, hostId: 'hostA'});
        await connect();

        roomHandlers[RoomEvent.RoomMetadataChanged](JSON.stringify({host_id: 'hostA'}));

        expect(setHost).not.toHaveBeenCalled();
    });

    it('should close the call without an error when the room is deleted', async () => {
        const closeCb = jest.fn();
        await connect([], closeCb);

        roomHandlers[RoomEvent.Disconnected](DisconnectReason.ROOM_DELETED);

        expect(closeCb).toHaveBeenCalledWith(undefined);
    });

    it('should close the call with hostRemovedErr when removed from the room', async () => {
        const closeCb = jest.fn();
        await connect([], closeCb);

        roomHandlers[RoomEvent.Disconnected](DisconnectReason.PARTICIPANT_REMOVED);

        expect(closeCb).toHaveBeenCalledWith(hostRemovedErr);
    });

    it('should close the call with an error on any other disconnect reason', async () => {
        const closeCb = jest.fn();
        await connect([], closeCb);

        roomHandlers[RoomEvent.Disconnected](DisconnectReason.SERVER_SHUTDOWN);

        expect(closeCb).toHaveBeenCalledWith(expect.any(Error));
    });

    it('publishes the microphone muted so the user joins muted', async () => {
        await connect([], () => {}, true);
        await advanceTimers(0);

        expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(expect.objectContaining({isMuted: true}));
    });

    it('unmutes the captured microphone once connected, even before its publish completes', async () => {
        mockRoom.localParticipant.publishTrack.mockReturnValue(new Promise(() => {}));
        const connection = await connect([], () => {}, true);

        connection.unmute();
        expect(micTrack?.isMuted).toBe(false);
    });

    it('publishes the microphone unmuted when unmuted before its capture finishes', async () => {
        let resolveCapture: (stream: unknown) => void = () => {};
        jest.mocked(mediaDevices.getUserMedia).mockReturnValueOnce(new Promise((resolve) => {
            resolveCapture = resolve;
        }) as never);
        const connection = await connect([], () => {}, true);

        connection.unmute();
        resolveCapture({getTracks: () => [{}]});
        await advanceTimers(0);

        expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(expect.objectContaining({isMuted: false}));
    });

    it('shows us live once a microphone unmuted before its capture finishes is published', async () => {
        let resolveCapture: (stream: unknown) => void = () => {};
        jest.mocked(mediaDevices.getUserMedia).mockReturnValueOnce(new Promise((resolve) => {
            resolveCapture = resolve;
        }) as never);
        const connection = await connect([], () => {}, true);

        connection.unmute();
        resolveCapture({getTracks: () => [{}]});
        await advanceTimers(0);

        expect(jest.mocked(setUserMuted).mock.lastCall).toEqual([SERVER_URL, CHANNEL_ID, SESSION_ID, false]);
    });

    it('publishes the microphone muted when unmuted and muted again before its capture finishes', async () => {
        let resolveCapture: (stream: unknown) => void = () => {};
        jest.mocked(mediaDevices.getUserMedia).mockReturnValueOnce(new Promise((resolve) => {
            resolveCapture = resolve;
        }) as never);
        const connection = await connect([], () => {}, true);

        connection.unmute();
        connection.mute();
        resolveCapture({getTracks: () => [{}]});
        await advanceTimers(0);

        expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(expect.objectContaining({isMuted: true}));
    });

    it('stops showing the user as live when the microphone capture fails', async () => {
        jest.mocked(mediaDevices.getUserMedia).mockRejectedValueOnce(new Error('capture failed'));
        await connect([], () => {}, true);
        await advanceTimers(0);

        expect(clearStartUnmuted).toHaveBeenCalled();
    });

    it('publishes the microphone when permission is granted mid-call', async () => {
        const connection = await connect();

        await connection.initializeVoiceTrack();

        expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(micTrack);
    });

    it('releases a microphone whose capture finishes after the call has ended', async () => {
        let resolveCapture: (stream: unknown) => void = () => {};
        jest.mocked(mediaDevices.getUserMedia).mockReturnValueOnce(new Promise((resolve) => {
            resolveCapture = resolve;
        }) as never);
        const connection = await connect([], () => {}, true);

        connection.disconnect();
        resolveCapture({getTracks: () => [{}]});
        await advanceTimers(0);

        expect(micTrack?.stop).toHaveBeenCalled();
    });

    it('does not publish the microphone or start audio routing when the call is left before the room connects', async () => {
        let finishConnect: () => void = () => {};
        mockRoom.connect.mockReturnValue(new Promise<void>((resolve) => {
            finishConnect = resolve;
        }));
        const connection = await newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, true, mockIntl);
        await advanceTimers(0);

        connection.disconnect();
        finishConnect();
        await advanceTimers(0);

        expect(micTrack?.stop).toHaveBeenCalled();
        expect(mockRoom.localParticipant.publishTrack).not.toHaveBeenCalled();
        expect(mockAudioRouteManager.start).not.toHaveBeenCalled();
    });

    it('does not connect the room when the call is left while the connection is being prepared', async () => {
        let finishPrepare: () => void = () => {};
        mockRoom.prepareConnection.mockReturnValue(new Promise<void>((resolve) => {
            finishPrepare = resolve;
        }));
        const connection = await newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, false, mockIntl);

        connection.disconnect();
        finishPrepare();
        await advanceTimers(0);

        expect(mockRoom.connect).not.toHaveBeenCalled();
    });

    it('disconnects the room when its connect completes after the call was left', async () => {
        let finishConnect: () => void = () => {};
        mockRoom.connect.mockReturnValue(new Promise<void>((resolve) => {
            finishConnect = resolve;
        }));
        const connection = await newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, false, mockIntl);
        await advanceTimers(0);

        connection.disconnect();
        mockRoom.disconnect.mockClear();
        finishConnect();
        await advanceTimers(0);

        expect(mockRoom.disconnect).toHaveBeenCalled();
    });

    it('releases a captured microphone that was never published on disconnect', async () => {
        mockRoom.connect.mockRejectedValue(new Error('connect failed'));
        await newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, true, mockIntl);
        await advanceTimers(0);

        expect(micTrack?.stop).toHaveBeenCalled();
    });

    it('seeds mute and raised-hand state for participants already in the room', async () => {
        await connect([
            participant('userA', 'sessionA', {muted: true}),
            participant('userB', 'sessionB', {muted: false, raisedHand: '1700000000000'}),
        ]);

        expect(setUserMuted).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'sessionA', true);
        expect(setUserMuted).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'sessionB', false);
        expect(setRaisedHand).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'sessionB', 1700000000000);
    });

    it('treats a participant with no published microphone as muted when seeding', async () => {
        await connect([participant('userA', 'sessionA')]);

        expect(setUserMuted).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'sessionA', true);
    });

    it('does not report our own microphone as muted before it is published', async () => {
        await connect([participant('userA', 'sessionA')]);

        expect(setUserMuted).not.toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, SESSION_ID, expect.anything());
    });

    it('turns voice off for a session that drops out of the active speaker set', async () => {
        await connect();

        roomHandlers[RoomEvent.ActiveSpeakersChanged]([participant('userA', 'sessionA')]);
        expect(setUserVoiceOn).toHaveBeenCalledWith(CHANNEL_ID, 'sessionA', true);

        roomHandlers[RoomEvent.ActiveSpeakersChanged]([]);
        expect(setUserVoiceOn).toHaveBeenCalledWith(CHANNEL_ID, 'sessionA', false);
    });

    it('raises the call quality alert only for the local participant degrading', async () => {
        await connect();

        roomHandlers[RoomEvent.ConnectionQualityChanged]('poor', participant('other', 'sessionB'));
        expect(setCallQualityAlert).not.toHaveBeenCalled();

        roomHandlers[RoomEvent.ConnectionQualityChanged]('poor', mockRoom.localParticipant);
        expect(setCallQualityAlert).toHaveBeenCalledWith(true);
    });

    it('publishes a reaction in the format the webapp client decodes', async () => {
        const connection = await connect();
        const emoji = {name: 'thumbsup', unified: '1F44D'};

        connection.sendReaction(emoji);
        await Promise.resolve();

        const [payload, opts] = mockRoom.localParticipant.publishData.mock.calls[0];
        expect(JSON.parse(new TextDecoder().decode(payload)).emojiData).toEqual(emoji);
        expect(opts).toEqual({reliable: true, topic: 'reaction'});
    });

    it('logs a reaction that fails to send', async () => {
        mockRoom.localParticipant.publishData.mockRejectedValueOnce(new Error('send failed'));
        const connection = await connect();

        connection.sendReaction({name: 'thumbsup', unified: '1F44D'});
        await advanceTimers(0);

        expect(logError).toHaveBeenCalled();
    });

    it('logs a hand raise that fails', async () => {
        mockRoom.localParticipant.setAttributes.mockRejectedValueOnce(new Error('update failed'));
        const connection = await connect();

        connection.raiseHand();
        await advanceTimers(0);

        expect(logError).toHaveBeenCalled();
    });

    it('logs a hand lower that fails', async () => {
        mockRoom.localParticipant.setAttributes.mockRejectedValueOnce(new Error('update failed'));
        const connection = await connect();

        connection.unraiseHand();
        await advanceTimers(0);

        expect(logError).toHaveBeenCalled();
    });

    it('stops showing the user as live when unmuting the microphone fails', async () => {
        const connection = await connect([], () => {}, true);
        await advanceTimers(0);
        micTrack?.unmute.mockRejectedValueOnce(new Error('track ended'));

        connection.unmute();
        await advanceTimers(0);

        expect(clearStartUnmuted).toHaveBeenCalled();
    });

    it('logs a room disconnect that fails', async () => {
        const connection = await connect();
        mockRoom.disconnect.mockRejectedValueOnce(new Error('close failed'));

        connection.disconnect();
        await advanceTimers(0);

        expect(logError).toHaveBeenCalled();
    });

    it('surfaces the senders own reaction, which livekit does not echo back', async () => {
        const connection = await connect();
        const emoji = {name: 'thumbsup', unified: '1F44D'};

        connection.sendReaction(emoji);

        expect(userReacted).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, expect.objectContaining({
            user_id: 'myuser',
            session_id: SESSION_ID,
            emoji,
        }));
    });

    it('delivers a received reaction to the reaction stream stamped with the receivers clock', async () => {
        await connect();
        jest.setSystemTime(1700000000000);
        const emoji = {name: 'thumbsup', unified: '1F44D'};
        const payload = new TextEncoder().encode(JSON.stringify({emojiData: emoji, timestamp: 1}));

        roomHandlers[RoomEvent.DataReceived](payload, participant('userA', 'sessionA'), undefined, 'reaction');

        expect(userReacted).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, {
            user_id: 'userA',
            session_id: 'sessionA',
            emoji,
            timestamp: 1700000000000,
        });
    });

    it.each([
        ['has no emoji', {timestamp: 1}],
        ['has a null emoji', {emojiData: null}],
        ['has a non-string emoji name', {emojiData: {name: 1, unified: '1F44D'}}],
        ['has an empty emoji name', {emojiData: {name: '', unified: '1F44D'}}],
        ['has a non-string literal', {emojiData: {name: 'thumbsup', unified: '1F44D', literal: {}}}],
        ['has no unified', {emojiData: {name: 'thumbsup'}}],
        ['has an oversized name', {emojiData: {name: 'a'.repeat(129), unified: '1F44D'}}],
        ['has an oversized literal', {emojiData: {name: 'thumbsup', unified: '1F44D', literal: 'a'.repeat(33)}}],
    ])('ignores a received reaction that %s', async (_, body) => {
        await connect();

        roomHandlers[RoomEvent.DataReceived](new TextEncoder().encode(JSON.stringify(body)), participant('userA', 'sessionA'), undefined, 'reaction');

        expect(userReacted).not.toHaveBeenCalled();
    });

    it('drops a reaction from the same session inside the minimum interval and accepts it after', async () => {
        await connect();
        const payload = new TextEncoder().encode(JSON.stringify({emojiData: {name: 'thumbsup', unified: '1F44D'}}));
        const react = () => roomHandlers[RoomEvent.DataReceived](payload, participant('userA', 'sessionA'), undefined, 'reaction');

        react();
        jest.advanceTimersByTime(Calls.REACTION_MIN_INTERVAL_MS - 1);
        react();
        jest.advanceTimersByTime(1);
        react();

        expect(userReacted).toHaveBeenCalledTimes(2);
    });

    it('accepts reactions from different sessions inside the minimum interval', async () => {
        await connect();
        const payload = new TextEncoder().encode(JSON.stringify({emojiData: {name: 'thumbsup', unified: '1F44D'}}));

        roomHandlers[RoomEvent.DataReceived](payload, participant('userA', 'sessionA'), undefined, 'reaction');
        roomHandlers[RoomEvent.DataReceived](payload, participant('userB', 'sessionB'), undefined, 'reaction');

        expect(userReacted).toHaveBeenCalledTimes(2);
    });

    it('ignores a received reaction whose payload is not valid json', async () => {
        await connect();

        roomHandlers[RoomEvent.DataReceived](new TextEncoder().encode('not json'), participant('userA', 'sessionA'), undefined, 'reaction');

        expect(userReacted).not.toHaveBeenCalled();
    });

    it('stops the audio session and route manager on disconnect', async () => {
        const connection = await connect();

        connection.disconnect();

        expect(mockRoom.disconnect).toHaveBeenCalled();
        expect(stopAudioSession).toHaveBeenCalled();
        expect(mockAudioRouteManager.stop).toHaveBeenCalled();
    });

    it('uses the audio route manager created for this connection', async () => {
        const connection = await connect();

        connection.setUserSelectedAudioRoute('SPEAKER_PHONE');

        expect(createAudioRouteManager).toHaveBeenCalled();
        expect(mockAudioRouteManager.setUserSelectedAudioRoute).toHaveBeenCalledWith('SPEAKER_PHONE');
    });
});
