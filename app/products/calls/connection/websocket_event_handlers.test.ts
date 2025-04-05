// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import {leaveCall, muteMyself, unraiseHand} from '@calls/actions';
import {createCallAndAddToIds} from '@calls/actions/calls';
import {hostRemovedErr} from '@calls/errors';
import {
    callEnded,
    callStarted,
    getCallsConfig,
    getCurrentCall,
    receivedCaption,
    removeIncomingCall,
    setCallForChannel,
    setCallScreenOff,
    setCallScreenOn,
    setCaptioningState,
    setChannelEnabled,
    setHost,
    setRaisedHand,
    setRecordingState,
    setUserMuted,
    setUserVoiceOn,
    userJoinedCall,
    userLeftCall,
    userReacted,
} from '@calls/state';
import {type HostControlsLowerHandMsgData, type HostControlsMsgData, DefaultCallsConfig, DefaultCurrentCall, DefaultCall} from '@calls/types/calls';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';

import {
    handleCallCaption,
    handleCallChannelDisabled,
    handleCallChannelEnabled,
    handleCallEnded,
    handleCallHostChanged,
    handleCallJobState,
    handleCallScreenOff,
    handleCallScreenOn,
    handleCallStarted,
    handleCallState,
    handleCallUserJoined,
    handleCallUserLeft,
    handleCallUserMuted,
    handleCallUserRaiseHand,
    handleCallUserReacted,
    handleCallUserUnmuted,
    handleCallUserUnraiseHand,
    handleCallUserVoiceOff,
    handleCallUserVoiceOn,
    handleHostLowerHand,
    handleHostMute,
    handleHostRemoved,
    handleUserDismissedNotification,
} from './websocket_event_handlers';

import type {
    CallHostChangedData,
    CallJobStateData,
    CallStartData,
    CallStateData,
    EmptyData,
    LiveCaptionData,
    UserDismissedNotification,
    UserJoinedData,
    UserLeftData,
    UserMutedUnmutedData,
    UserRaiseUnraiseHandData,
    UserReactionData,
    UserScreenOnOffData,
    UserVoiceOnOffData,
} from '@mattermost/calls/lib/types';

jest.mock('@actions/remote/user');
jest.mock('@calls/actions/calls');
jest.mock('@calls/state');
jest.mock('@database/manager');
jest.mock('@queries/servers/system');

describe('websocket event handlers', () => {
    const serverUrl = 'server1';
    const channelId = 'channel-id';
    const userId = 'user-id';
    const sessionId = 'session-id';

    beforeAll(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getCallsConfig).mockReturnValue({
            ...DefaultCallsConfig,
            version: {version: '0.21.0'},
        });
        jest.mocked(getCurrentCall).mockReturnValue({
            ...DefaultCurrentCall,
            serverUrl,
            channelId,
            mySessionId: sessionId,
            id: 'call-id',
            startTime: Date.now(),
            ownerId: 'owner-id',
            hostId: 'host-id',
            threadId: 'thread-id',
        });
    });

    describe('handleCallUserJoined/Left', () => {
        it('should handle user joined', () => {
            handleCallUserJoined(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {user_id: userId, session_id: sessionId},
            } as WebSocketMessage<UserJoinedData>);
            expect(fetchUsersByIds).toHaveBeenCalledWith(serverUrl, [userId]);
            expect(userJoinedCall).toHaveBeenCalledWith(serverUrl, channelId, userId, sessionId);
        });

        it('should handle user left', () => {
            handleCallUserLeft(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId},
            } as WebSocketMessage<UserLeftData>);
            expect(userLeftCall).toHaveBeenCalledWith(serverUrl, channelId, sessionId);
        });
    });

    describe('handleCallUserMuted/Unmuted', () => {
        it('should handle user muted', () => {
            handleCallUserMuted(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId},
            } as WebSocketMessage<UserMutedUnmutedData>);
            expect(setUserMuted).toHaveBeenCalledWith(serverUrl, channelId, sessionId, true);
        });

        it('should handle user unmuted', () => {
            handleCallUserUnmuted(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId},
            } as WebSocketMessage<UserMutedUnmutedData>);
            expect(setUserMuted).toHaveBeenCalledWith(serverUrl, channelId, sessionId, false);
        });
    });

    describe('handleCallUserVoiceOn/Off', () => {
        it('should handle voice on', () => {
            handleCallUserVoiceOn({
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId},
            } as WebSocketMessage<UserVoiceOnOffData>);
            expect(setUserVoiceOn).toHaveBeenCalledWith(channelId, sessionId, true);
        });

        it('should handle voice off', () => {
            handleCallUserVoiceOff({
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId},
            } as WebSocketMessage<UserVoiceOnOffData>);
            expect(setUserVoiceOn).toHaveBeenCalledWith(channelId, sessionId, false);
        });
    });

    describe('handleCallStarted/Ended', () => {
        it('should handle call started', () => {
            const startTime = Date.now();
            handleCallStarted(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {
                    id: 'call-id',
                    channelID: channelId,
                    start_at: startTime,
                    thread_id: 'thread-id',
                    owner_id: 'owner-id',
                    host_id: 'host-id',
                },
            } as WebSocketMessage<CallStartData>);
            expect(callStarted).toHaveBeenCalledWith(serverUrl, {
                id: 'call-id',
                channelId,
                startTime,
                threadId: 'thread-id',
                screenOn: '',
                sessions: {},
                ownerId: 'owner-id',
                hostId: 'host-id',
                dismissed: {},
            });
        });

        it('should handle call ended', () => {
            jest.spyOn(DeviceEventEmitter, 'emit');
            handleCallEnded(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {},
            } as WebSocketMessage<EmptyData>);
            expect(DeviceEventEmitter.emit).toHaveBeenCalledWith('custom_com.mattermost.calls_call_end', {channelId});
            expect(callEnded).toHaveBeenCalledWith(serverUrl, channelId);
        });
    });

    describe('handleCallChannelEnabled/Disabled', () => {
        it('should handle channel enabled', () => {
            handleCallChannelEnabled(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {},
            } as WebSocketMessage<EmptyData>);
            expect(setChannelEnabled).toHaveBeenCalledWith(serverUrl, channelId, true);
        });

        it('should handle channel disabled', () => {
            handleCallChannelDisabled(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {},
            } as WebSocketMessage<EmptyData>);
            expect(setChannelEnabled).toHaveBeenCalledWith(serverUrl, channelId, false);
        });
    });

    describe('handleCallScreenOn/Off', () => {
        it('should handle screen on', () => {
            handleCallScreenOn(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId},
            } as WebSocketMessage<UserScreenOnOffData>);
            expect(setCallScreenOn).toHaveBeenCalledWith(serverUrl, channelId, sessionId);
        });

        it('should handle screen off', () => {
            handleCallScreenOff(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId},
            } as WebSocketMessage<UserScreenOnOffData>);
            expect(setCallScreenOff).toHaveBeenCalledWith(serverUrl, channelId, sessionId);
        });
    });

    describe('handleCallUserRaiseHand/UnraiseHand', () => {
        it('should handle raise hand', () => {
            handleCallUserRaiseHand(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId, raised_hand: 12345},
            } as WebSocketMessage<UserRaiseUnraiseHandData>);
            expect(setRaisedHand).toHaveBeenCalledWith(serverUrl, channelId, sessionId, 12345);
        });

        it('should handle unraise hand', () => {
            handleCallUserUnraiseHand(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {session_id: sessionId, raised_hand: 0},
            } as WebSocketMessage<UserRaiseUnraiseHandData>);
            expect(setRaisedHand).toHaveBeenCalledWith(serverUrl, channelId, sessionId, 0);
        });
    });

    describe('handleCallUserReacted', () => {
        it('should handle user reaction for new version', () => {
            jest.mocked(getCallsConfig).mockReturnValue({
                ...DefaultCallsConfig,
                version: {version: '0.21.0'},
            });
            const reactionData = {
                user_id: userId,
                session_id: sessionId,
                reaction: '👍',
                timestamp: 12345,
                emoji: {name: 'thumbsup', unified: '1F44D'},
            };
            handleCallUserReacted(serverUrl, {
                event: 'custom_com.mattermost.calls_reaction',
                seq: 1,
                broadcast: {
                    omit_users: {} as Dictionary<boolean>,
                    user_id: '',
                    team_id: '',
                    channel_id: channelId,
                },
                data: reactionData,
            } as WebSocketMessage<UserReactionData>);
            expect(userReacted).toHaveBeenCalledWith(serverUrl, channelId, reactionData);
        });
    });

    describe('handleCallHostChanged', () => {
        it('should handle host changed', () => {
            handleCallHostChanged(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {hostID: 'new-host-id'},
            } as WebSocketMessage<CallHostChangedData>);
            expect(setHost).toHaveBeenCalledWith(serverUrl, channelId, 'new-host-id');
        });
    });

    describe('handleHostControls', () => {
        it('should handle host mute', () => {
            handleHostMute(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {channel_id: channelId, session_id: sessionId},
            } as WebSocketMessage<HostControlsMsgData>);
            expect(muteMyself).toHaveBeenCalled();
        });

        it('should not handle host mute for different server', () => {
            handleHostMute('different-server', {
                broadcast: {channel_id: channelId},
                data: {channel_id: channelId, session_id: sessionId},
            } as WebSocketMessage<HostControlsMsgData>);
            expect(muteMyself).not.toHaveBeenCalled();
        });

        it('should handle host lower hand', () => {
            handleHostLowerHand(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {channel_id: channelId, session_id: sessionId},
            } as WebSocketMessage<HostControlsLowerHandMsgData>);
            expect(unraiseHand).toHaveBeenCalled();
        });

        it('should not handle host lower hand for different server', () => {
            handleHostLowerHand('different-server', {
                broadcast: {channel_id: channelId},
                data: {channel_id: channelId, session_id: sessionId},
            } as WebSocketMessage<HostControlsLowerHandMsgData>);
            expect(unraiseHand).not.toHaveBeenCalled();
        });

        it('should handle host removed', () => {
            handleHostRemoved(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {channel_id: channelId, session_id: sessionId},
            } as WebSocketMessage<HostControlsMsgData>);
            expect(leaveCall).toHaveBeenCalledWith(hostRemovedErr);
        });

        it('should not handle host removed for different server', () => {
            handleHostRemoved('different-server', {
                broadcast: {channel_id: channelId},
                data: {channel_id: channelId, session_id: sessionId},
            } as WebSocketMessage<HostControlsMsgData>);
            expect(leaveCall).not.toHaveBeenCalled();
        });
    });

    describe('handleUserDismissedNotification', () => {
        it('should handle user dismissed notification for current user', async () => {
            const myUserId = 'my-user-id';
            jest.mocked(getCurrentUserId).mockResolvedValue(myUserId);

            await handleUserDismissedNotification(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {
                    userID: myUserId,
                    callID: 'call-id',
                },
            } as WebSocketMessage<UserDismissedNotification>);

            expect(removeIncomingCall).toHaveBeenCalledWith(serverUrl, 'call-id');
        });

        it('should not handle user dismissed notification for other users', async () => {
            const myUserId = 'my-user-id';
            jest.mocked(getCurrentUserId).mockResolvedValue(myUserId);

            await handleUserDismissedNotification(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {
                    userID: 'other-user-id',
                    callID: 'call-id',
                },
            } as WebSocketMessage<UserDismissedNotification>);

            expect(removeIncomingCall).not.toHaveBeenCalled();
        });

        it('should not handle user dismissed notification when database is unavailable', async () => {
            await handleUserDismissedNotification('server2', {
                broadcast: {channel_id: channelId},
                data: {
                    userID: 'user-id',
                    callID: 'call-id',
                },
            } as WebSocketMessage<UserDismissedNotification>);

            expect(removeIncomingCall).not.toHaveBeenCalled();
        });
    });

    describe('handleCallJobState', () => {
        it('should handle recording job state', () => {
            const jobState = {
                type: 'recording',
                init_at: 12345,
                start_at: 12345,
                end_at: 0,
            };

            handleCallJobState(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {jobState},
            } as WebSocketMessage<CallJobStateData>);

            expect(setRecordingState).toHaveBeenCalledWith(serverUrl, channelId, jobState);
            expect(setCaptioningState).not.toHaveBeenCalled();
        });

        it('should handle captioning job state', () => {
            const jobState = {
                type: 'captioning',
                init_at: 12345,
                start_at: 12345,
                end_at: 0,
            };

            handleCallJobState(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {jobState},
            } as WebSocketMessage<CallJobStateData>);

            expect(setCaptioningState).toHaveBeenCalledWith(serverUrl, channelId, jobState);
            expect(setRecordingState).not.toHaveBeenCalled();
        });
    });

    describe('handleCallCaption', () => {
        it('should handle call caption', () => {
            const captionData = {
                session_id: 'session-id',
                caption_id: 'caption-id',
                channel_id: channelId,
                user_id: 'user-id',
                text: 'Hello world',
                start_at: 12345,
                end_at: 12346,
            };

            handleCallCaption(serverUrl, {
                event: 'custom_com.mattermost.calls_caption',
                seq: 1,
                broadcast: {
                    omit_users: {} as Dictionary<boolean>,
                    user_id: '',
                    team_id: '',
                    channel_id: channelId,
                },
                data: captionData,
            } as WebSocketMessage<LiveCaptionData>);

            expect(receivedCaption).toHaveBeenCalledWith(serverUrl, captionData);
        });
    });

    describe('handleCallState', () => {
        it('should handle call state', () => {
            const callState = {
                ...DefaultCall,
                id: 'call-id',
                channelId,
                startTime: Date.now(),
                screenOn: '',
                sessions: {},
                ownerId: 'owner-id',
                hostId: 'host-id',
                dismissed: {},
                recording: {
                    init_at: 12345,
                    start_at: 12345,
                    end_at: 0,
                },
                live_captions: {
                    init_at: 12345,
                    start_at: 12345,
                    end_at: 0,
                },
            };

            jest.mocked(createCallAndAddToIds).mockReturnValue(callState);

            handleCallState(serverUrl, {
                broadcast: {channel_id: channelId},
                data: {
                    channel_id: channelId,
                    call: JSON.stringify(callState),
                },
            } as WebSocketMessage<CallStateData>);

            expect(createCallAndAddToIds).toHaveBeenCalledWith(channelId, callState);
            expect(setCallForChannel).toHaveBeenCalledWith(serverUrl, channelId, callState);
            expect(setRecordingState).toHaveBeenCalledWith(serverUrl, channelId, callState.recording);
            expect(setCaptioningState).toHaveBeenCalledWith(serverUrl, channelId, callState.live_captions);
        });
    });
});
