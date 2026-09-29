// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {registerGlobals} from '@livekit/react-native';
import {mediaDevices, type MediaStream} from '@livekit/react-native-webrtc';
import {
    AudioPresets,
    ConnectionQuality,
    LocalAudioTrack,
    Room,
    RoomEvent,
    Track,
    type Participant,
    type RemoteParticipant,
    type RemoteTrack,
    type RemoteTrackPublication,
    type TrackPublication,
} from 'livekit-client';
import {DeviceEventEmitter, type EmitterSubscription, Platform} from 'react-native';

import {peerConnectTimeout} from '@calls/connection/constants';
import {createAudioRouteManager, startAudioSession, stopAudioSession} from '@calls/connection/session/audio';
import {foregroundServiceStart, foregroundServiceStop} from '@calls/connection/session/foreground_service';
import {setCallQualityAlert, setRaisedHand, setUserMuted, setUserVoiceOn, userReacted} from '@calls/state';
import {type CallsConnection} from '@calls/types/calls';
import {WebsocketEvents} from '@constants';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError, logWarning} from '@utils/log';

import {WebSocketClient, wsReconnectionTimeoutErr} from '../websocket_client';

import {CALL_ATTRIBUTES, CALL_MESSAGE_TOPICS} from './constants';
import {parseIdentity} from './identity';

import type {EmojiData} from '@mattermost/calls/lib/types';
import type {IntlShape} from 'react-intl';

type ReactionPayload = {
    emojiData: EmojiData;
    timestamp: number;
}

const isBot = (participant: Participant) => participant.attributes?.[CALL_ATTRIBUTES.BOT] === 'true';

const isMicMuted = (participant: Participant) =>
    participant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true;

const raisedHandAt = (participant: Participant) =>
    Number(participant.attributes?.[CALL_ATTRIBUTES.RAISED_HAND] ?? '') || 0;

export async function newLiveKitConnection(
    serverUrl: string,
    channelID: string,
    closeCb: (err?: Error) => void,
    setScreenShareURL: (url: string) => void,
    hasMicPermission: boolean,
    intl: IntlShape,
    title?: string,
    rootId?: string,
) {
    let isClosed = false;
    let isRoomConnected = false;
    let micPublishInProgress = false;
    let onCallEnd: EmitterSubscription | null = null;
    let onPeerConnected: ((sessionId: string) => void) | null = null;
    let activeSessions = new Set<string>();

    // LiveKit's audio session management is left off: @mattermost/calls-native owns
    // AVAudioSession, and autoConfigureAudioSession defaults to true.
    registerGlobals({autoConfigureAudioSession: false});

    // getClient can throw an error, which will be handled by the caller.
    const client = NetworkManager.getClient(serverUrl);
    const credentials = await getServerCredentials(serverUrl);

    const audioRoute = createAudioRouteManager();

    const room = new Room({
        audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
        },
        publishDefaults: {
            dtx: true,
            red: true,
            audioPreset: AudioPresets.speech,
        },
        adaptiveStream: false,
        dynacast: false,
    });

    const ws = new WebSocketClient(serverUrl, client.getWebSocketUrl(), credentials?.token);

    await startAudioSession();

    try {
        await ws.initialize();
    } catch (err) {
        await stopAudioSession();

        // Rethrows the error, to be caught by the caller.
        throw err;
    }

    const micPublication = () => room.localParticipant.getTrackPublication(Track.Source.Microphone);

    const mute = () => {
        micPublication()?.mute();
    };

    // Reports whether the mute actually went out: callers show us as live off the back of it, and
    // there is no publication to unmute if the mic lost its race with the room connection.
    const unmute = () => {
        const pub = micPublication();
        if (!pub) {
            return false;
        }

        pub.unmute();
        return true;
    };

    const initializeVoiceTrack = async () => {
        if (micPublishInProgress || micPublication()) {
            return;
        }
        micPublishInProgress = true;

        try {
            const stream = await mediaDevices.getUserMedia({video: false, audio: true}) as MediaStream;
            const audioTrack = stream.getTracks()[0];
            const localAudioTrack = new LocalAudioTrack(audioTrack as never, undefined, false);
            localAudioTrack.source = Track.Source.Microphone;

            await room.localParticipant.publishTrack(localAudioTrack);

            // publishTrack always publishes unmuted, so mute to join muted.
            mute();
        } catch (err) {
            logError('calls: unable to publish microphone track:', getFullErrorMessage(err));
        } finally {
            micPublishInProgress = false;
        }
    };

    const disconnect = (err?: Error) => {
        if (isClosed) {
            return;
        }
        isClosed = true;

        ws.send('leave');
        ws.close();

        if (onCallEnd) {
            onCallEnd.remove();
            onCallEnd = null;
        }

        room.disconnect();
        stopAudioSession();
        audioRoute.stop();

        if (Platform.OS === 'android') {
            foregroundServiceStop();
        }

        if (closeCb) {
            closeCb(err);
        }
    };

    onCallEnd = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_CALL_END, ({channelId}: { channelId: string }) => {
        if (channelId === channelID) {
            disconnect();
        }
    });

    const raiseHand = () => {
        room.localParticipant.setAttributes({[CALL_ATTRIBUTES.RAISED_HAND]: String(Date.now())});
    };

    const unraiseHand = () => {
        room.localParticipant.setAttributes({[CALL_ATTRIBUTES.RAISED_HAND]: ''});
    };

    const sendReaction = (emoji: EmojiData) => {
        const timestamp = Date.now();
        const payload: ReactionPayload = {emojiData: emoji, timestamp};

        room.localParticipant.publishData(
            new TextEncoder().encode(JSON.stringify(payload)),
            {reliable: true, topic: CALL_MESSAGE_TOPICS.REACTION},
        );

        // publishData does not deliver to the sender, so the local reaction is surfaced here.
        // On the rtcd path the server's broadcast echoes back and does this instead.
        const {userID, sessionID} = parseIdentity(room.localParticipant.identity);
        userReacted(serverUrl, channelID, {
            user_id: userID,
            session_id: sessionID,
            emoji,
            timestamp,
        });
    };

    // Mute and raised hand only reach us as change events, so a call already in progress
    // needs its current state read off the participants present at connect time.
    const seedParticipantState = (participant: Participant) => {
        if (isBot(participant)) {
            return;
        }

        const {sessionID} = parseIdentity(participant.identity);
        setUserMuted(serverUrl, channelID, sessionID, isMicMuted(participant));

        const raisedHand = raisedHandAt(participant);
        if (raisedHand > 0) {
            setRaisedHand(serverUrl, channelID, sessionID, raisedHand);
        }
    };

    const setMutedFromPublication = (publication: TrackPublication, participant: Participant, muted: boolean) => {
        if (publication.source !== Track.Source.Microphone || isBot(participant)) {
            return;
        }

        const {sessionID} = parseIdentity(participant.identity);
        setUserMuted(serverUrl, channelID, sessionID, muted);
    };

    room.on(RoomEvent.Connected, () => {
        isRoomConnected = true;

        seedParticipantState(room.localParticipant);
        room.remoteParticipants.forEach(seedParticipantState);

        if (onPeerConnected) {
            onPeerConnected(ws.sessionID);
            onPeerConnected = null;
        }
    });

    room.on(RoomEvent.Disconnected, () => {
        logDebug('calls: livekit room disconnected');
        if (!isClosed) {
            disconnect();
        }
    });

    room.on(RoomEvent.TrackMuted, (publication: TrackPublication, participant: Participant) => {
        setMutedFromPublication(publication, participant, true);
    });

    room.on(RoomEvent.TrackUnmuted, (publication: TrackPublication, participant: Participant) => {
        setMutedFromPublication(publication, participant, false);
    });

    room.on(RoomEvent.ParticipantAttributesChanged, (changed: Record<string, string>, participant: Participant) => {
        if (!(CALL_ATTRIBUTES.RAISED_HAND in changed) || isBot(participant)) {
            return;
        }

        const {sessionID} = parseIdentity(participant.identity);
        setRaisedHand(serverUrl, channelID, sessionID, raisedHandAt(participant));
    });

    // LiveKit reports the whole active set; mobile's state is per-session and edge-triggered,
    // so transitions have to be derived from the previous set.
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const nextSessions = new Set(
            speakers.filter((s) => !isBot(s)).map((s) => parseIdentity(s.identity).sessionID),
        );

        for (const sessionID of nextSessions) {
            if (!activeSessions.has(sessionID)) {
                setUserVoiceOn(channelID, sessionID, true);
            }
        }

        for (const sessionID of activeSessions) {
            if (!nextSessions.has(sessionID)) {
                setUserVoiceOn(channelID, sessionID, false);
            }
        }

        activeSessions = nextSessions;
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant, _kind?: number, topic?: string) => {
        if (topic !== CALL_MESSAGE_TOPICS.REACTION || !participant) {
            return;
        }

        const {userID, sessionID} = parseIdentity(participant.identity);
        try {
            const {emojiData, timestamp} = JSON.parse(new TextDecoder().decode(payload)) as ReactionPayload;
            userReacted(serverUrl, channelID, {
                user_id: userID,
                session_id: sessionID,
                emoji: emojiData,
                timestamp,
            });
        } catch (err) {
            logError('calls: failed to parse received reaction:', getFullErrorMessage(err));
        }
    });

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
        if (publication.source !== Track.Source.ScreenShare) {
            return;
        }

        // Typed as the DOM MediaStream, but under React Native this is the webrtc fork's,
        // which is what exposes toURL(). The LiveKit RN SDK's own VideoView does the same.
        const stream = track.mediaStream as unknown as MediaStream | undefined;
        if (stream) {
            setScreenShareURL(stream.toURL());
        }
    });

    room.on(RoomEvent.TrackUnsubscribed, (_track: RemoteTrack, publication: RemoteTrackPublication) => {
        if (publication.source === Track.Source.ScreenShare) {
            setScreenShareURL('');
        }
    });

    // The alert is about the user's own connection, so remote participants are ignored.
    room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, participant: Participant) => {
        if (participant.identity !== room.localParticipant.identity) {
            return;
        }

        setCallQualityAlert(quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost);
    });

    ws.on('error', (err: Error) => {
        logDebug('calls: ws error', err);
        if (err === wsReconnectionTimeoutErr) {
            disconnect();
        }
    });

    ws.on('close', (event: WebSocketCloseEvent) => {
        logDebug('calls: ws close, code:', event?.code, 'reason:', event?.reason, 'message:', event?.message);
    });

    ws.on('open', (originalConnID: string, prevConnID: string, isReconnect: boolean) => {
        if (isReconnect) {
            logDebug('calls: ws reconnect, sending reconnect msg');
            ws.send('reconnect', {
                channelID,
                originalConnID,
                prevConnID,
            });
        } else {
            logDebug('calls: ws open, sending join msg');
            ws.send('join', {
                channelID,
                title,
                threadID: rootId,
            });
        }
    });

    // The join ack is the point the server has registered this session, which the token is
    // minted against.
    ws.on('join', async () => {
        logDebug('calls: join ack received, connecting to livekit room');

        if (Platform.OS === 'android') {
            // To allow us to use microphone in the background
            foregroundServiceStart(intl);
        }

        let token;
        let url;
        try {
            ({token, url} = await client.getLiveKitToken(channelID, ws.sessionID));
        } catch (err) {
            logError('calls: failed to fetch livekit token:', getFullErrorMessage(err));
            disconnect(new Error('failed to fetch livekit token'));
            return;
        }

        try {
            await room.prepareConnection(url, token);
        } catch (err) {
            logWarning('calls: livekit prepareConnection failed, continuing:', getFullErrorMessage(err));
        }

        try {
            await room.connect(url, token);
        } catch (err) {
            logError('calls: failed to connect to livekit room:', getFullErrorMessage(err));
            disconnect(new Error('failed to connect to livekit room'));
            return;
        }

        await audioRoute.start();

        if (hasMicPermission) {
            initializeVoiceTrack();
        }
    });

    const waitForPeerConnection = () => {
        return new Promise<string>((resolve, reject) => {
            if (isRoomConnected) {
                resolve(ws.sessionID);
                return;
            }

            onPeerConnected = resolve;

            setTimeout(() => {
                if (onPeerConnected) {
                    onPeerConnected = null;
                    reject(new Error('timed out waiting for peer connection'));
                }
            }, peerConnectTimeout);
        });
    };

    const connection: CallsConnection = {
        disconnect,
        mute,
        unmute,
        waitForPeerConnection,
        raiseHand,
        unraiseHand,
        sendReaction,
        initializeVoiceTrack,
        setUserSelectedAudioRoute: audioRoute.setUserSelectedAudioRoute,
    };

    return connection;
}
