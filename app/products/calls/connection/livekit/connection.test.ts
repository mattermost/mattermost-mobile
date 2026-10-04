// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {DisconnectReason, LocalAudioTrack, Room, RoomEvent} from 'livekit-client';
import {Platform} from 'react-native';

import {fetchMissingProfilesByIds} from '@actions/remote/user';
import {createAudioRouteManager, stopAudioSession} from '@calls/connection/session/audio';
import {hostRemovedErr} from '@calls/errors';
import {
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
import NetworkManager from '@managers/network_manager';
import {enableFakeTimers, disableFakeTimers} from '@test/timer_helpers';

import {newLiveKitConnection} from './connection';

import type {CallState} from '@mattermost/calls/lib/types';

jest.mock('@actions/remote/user', () => ({
    fetchMissingProfilesByIds: jest.fn(),
}));
jest.mock('@calls/state', () => ({
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
    sessions: [{session_id: 'sessionA', user_id: 'userA', unmuted: true, raised_hand: 0}],
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

describe('newLiveKitConnection', () => {
    const mockClient = {
        createLiveKitSession: jest.fn(),
    };

    const mockIntl = {formatMessage: jest.fn((m) => m.defaultMessage)} as unknown as import('react-intl').IntlShape;

    let roomHandlers: Record<string, any>;
    let mockRoom: any;
    let micPublication: {isMuted: boolean; mute: jest.Mock; unmute: jest.Mock} | undefined;

    const connect = async (remoteParticipants: any[] = [], closeCb: (err?: Error) => void = () => {}) => {
        mockRoom.remoteParticipants = new Map(remoteParticipants.map((p) => [p.identity, p]));

        const connection = await newLiveKitConnection(
            SERVER_URL, CHANNEL_ID, closeCb, () => {}, false, mockIntl, 'title', 'root-id',
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
                publishTrack: jest.fn(() => {
                    micPublication = {isMuted: false, mute: jest.fn(), unmute: jest.fn()};
                    return Promise.resolve(micPublication);
                }),
                setAttributes: jest.fn(() => Promise.resolve()),
                publishData: jest.fn(() => Promise.resolve()),
            },
        };
        (Room as unknown as jest.Mock).mockImplementation(() => mockRoom);
        (LocalAudioTrack as unknown as jest.Mock).mockImplementation(() => ({source: undefined}));
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

    it('should stop the audio session and reject when the join request fails', async () => {
        const joinError = new Error('join failed');
        mockClient.createLiveKitSession.mockRejectedValue(joinError);

        await expect(newLiveKitConnection(SERVER_URL, CHANNEL_ID, () => {}, () => {}, false, mockIntl)).rejects.toBe(joinError);
        expect(stopAudioSession).toHaveBeenCalled();
    });

    it('should seed the channel call and its sessions from the join response', async () => {
        await connect([participant('userA', 'sessionA')]);

        expect(setCallForChannel).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, expect.objectContaining({
            id: 'call-id',
            hostId: 'userA',
            sessions: {sessionA: {userId: 'userA', sessionId: 'sessionA', muted: false, raisedHand: 0}},
        }));
        expect(fetchMissingProfilesByIds).toHaveBeenCalledWith(SERVER_URL, ['userA']);
        expect(setRecordingState).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, recording);
        expect(setCaptioningState).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, liveCaptions);
    });

    it('should drop sessions from the join response that are not in the room once connected', async () => {
        mockClient.createLiveKitSession.mockResolvedValue({
            session_id: SESSION_ID,
            token: LIVEKIT_TOKEN,
            url: LIVEKIT_URL,
            call_state: {
                ...callState,
                sessions: [
                    {session_id: SESSION_ID, user_id: 'myuser', unmuted: false, raised_hand: 0},
                    {session_id: 'sessionA', user_id: 'userA', unmuted: true, raised_hand: 0},
                    {session_id: 'pendingSession', user_id: 'userB', unmuted: false, raised_hand: 0},
                ],
            },
        });

        await connect([participant('userA', 'sessionA')]);

        expect(jest.mocked(userLeftCall).mock.calls).toEqual([
            [SERVER_URL, CHANNEL_ID, 'pendingSession'],
        ]);
    });

    it('should drop stale join response sessions before adding our own, so an unconnected callee does not mark the call answered', async () => {
        mockClient.createLiveKitSession.mockResolvedValue({
            session_id: SESSION_ID,
            token: LIVEKIT_TOKEN,
            url: LIVEKIT_URL,
            call_state: {...callState, sessions: [{session_id: 'pendingSession', user_id: 'userB', unmuted: false, raised_hand: 0}]},
        });

        await connect();

        const [leftOrder] = jest.mocked(userLeftCall).mock.invocationCallOrder;
        const [joinedOrder] = jest.mocked(userJoinedCall).mock.invocationCallOrder;
        expect(leftOrder).toBeLessThan(joinedOrder);
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
        const connection = await connect();
        await connection.initializeVoiceTrack();

        expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled();
        expect(micPublication!.mute).toHaveBeenCalled();
    });

    it('unmuting reports false when no microphone has been published', async () => {
        const connection = await connect();

        expect(connection.unmute()).toBe(false);
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

    it('delivers a received reaction to the reaction stream', async () => {
        await connect();
        const emoji = {name: 'thumbsup', unified: '1F44D'};
        const payload = new TextEncoder().encode(JSON.stringify({emojiData: emoji, timestamp: 1700000000000}));

        roomHandlers[RoomEvent.DataReceived](payload, participant('userA', 'sessionA'), undefined, 'reaction');

        expect(userReacted).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, {
            user_id: 'userA',
            session_id: 'sessionA',
            emoji,
            timestamp: 1700000000000,
        });
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
