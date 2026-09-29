// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {LocalAudioTrack, Room, RoomEvent} from 'livekit-client';
import {Platform} from 'react-native';

import {createAudioRouteManager, startAudioSession, stopAudioSession} from '@calls/connection/session/audio';
import {setCallQualityAlert, setRaisedHand, setUserMuted, setUserVoiceOn, userReacted} from '@calls/state';
import NetworkManager from '@managers/network_manager';
import {enableFakeTimers, disableFakeTimers} from '@test/timer_helpers';

import {WebSocketClient} from '../websocket_client';

import {newLiveKitConnection} from './connection';

jest.mock('../websocket_client');
jest.mock('@calls/state', () => ({
    setCallQualityAlert: jest.fn(),
    setRaisedHand: jest.fn(),
    setUserMuted: jest.fn(),
    setUserVoiceOn: jest.fn(),
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
        getWebSocketUrl: jest.fn(() => 'ws://localhost:8065'),
        getLiveKitToken: jest.fn(() => Promise.resolve({token: 'jwt-token', url: 'wss://livekit.example.com'})),
    };

    const mockIntl = {formatMessage: jest.fn((m) => m.defaultMessage)} as unknown as import('react-intl').IntlShape;

    let roomHandlers: Record<string, any>;
    let mockRoom: any;
    let micPublication: {isMuted: boolean; mute: jest.Mock; unmute: jest.Mock} | undefined;

    const connect = async (remoteParticipants: any[] = []) => {
        mockRoom.remoteParticipants = new Map(remoteParticipants.map((p) => [p.identity, p]));

        const connection = await newLiveKitConnection(
            SERVER_URL, CHANNEL_ID, () => {}, () => {}, false, mockIntl,
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

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
            close: jest.fn(),
            sessionID: SESSION_ID,
        }));
    });

    afterEach(() => {
        disableFakeTimers();
    });

    it('fetches a token for the websocket session and connects the room with it', async () => {
        await connect();

        expect(mockClient.getLiveKitToken).toHaveBeenCalledWith(CHANNEL_ID, SESSION_ID);
        expect(mockRoom.connect).toHaveBeenCalledWith('wss://livekit.example.com', 'jwt-token');
        expect(startAudioSession).toHaveBeenCalled();
        expect(mockAudioRouteManager.start).toHaveBeenCalled();
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

    it('excludes the recording bot when seeding', async () => {
        await connect([participant('botuser', 'botsession', {muted: true, bot: true})]);

        expect(setUserMuted).not.toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, 'botsession', expect.anything());
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
