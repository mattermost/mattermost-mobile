// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {hostRemove} from '@calls/actions/calls';
import {EndCallReturn} from '@calls/types/calls';
import DatabaseManager from '@database/manager';
import {dismissBottomSheet} from '@screens/navigation';

import {
    showLimitRestrictedAlert,
    recordingAlert,
    stopRecordingConfirmationAlert,
    recordingWillBePostedAlert,
    recordingErrorAlert,
    removeFromCall,
    endCallConfirmationAlert,
    needsRecordingAlert,
    needsRecordingWillBePostedAlert,
    needsRecordingErrorAlert,
    leaveAndJoinWithAlert,
} from './alerts';

jest.mock('@calls/actions', () => ({
    leaveCall: jest.fn(),
    joinCall: jest.fn().mockResolvedValue({}),
    hasMicrophonePermission: jest.fn().mockResolvedValue(true),
    unmuteMyself: jest.fn(),
    dismissIncomingCall: jest.fn(),
    removeIncomingCall: jest.fn(),
}));
jest.mock('@calls/actions/permissions', () => ({
    hasBluetoothPermission: jest.fn().mockResolvedValue(true),
}));
jest.mock('@calls/state', () => ({
    getCallsState: jest.fn(),
    getChannelsWithCalls: jest.fn(),
    getCurrentCall: jest.fn(),
    getCallsConfig: jest.fn(),
    setMicPermissionsGranted: jest.fn(),
}));
jest.mock('@calls/actions/calls');
jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/user', () => ({
    getUserById: jest.fn(() => Promise.resolve({
        username: 'user-1',
    })),
    getCurrentUser: jest.fn().mockResolvedValue({
        username: 'user-1',
        roles: 'system_user',
    }),
}));

describe('alerts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('showLimitRestrictedAlert', () => {
        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}, values?: any) => {
                if (values) {
                    return defaultMessage.replace('{maxParticipants}', values.maxParticipants);
                }
                return defaultMessage;
            },
        };

        it('shows alert for cloud starter', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            showLimitRestrictedAlert({
                limitRestricted: true,
                maxParticipants: 8,
                isCloudStarter: true,
            }, intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'This call is at capacity',
                'Upgrade to Cloud Professional or Cloud Enterprise to enable group calls with more than 8 participants.',
                [
                    {
                        text: 'Okay',
                        style: 'cancel',
                    },
                ],
            );
        });

        it('shows alert for non-cloud starter', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            showLimitRestrictedAlert({
                limitRestricted: true,
                maxParticipants: 8,
                isCloudStarter: false,
            }, intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'This call is at capacity',
                'The maximum number of participants per call is 8. Contact your System Admin to increase the limit.',
                [
                    {
                        text: 'Okay',
                        style: 'cancel',
                    },
                ],
            );
        });
    });

    describe('recordingAlert', () => {
        beforeEach(() => {
            needsRecordingAlert();
        });

        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        };

        it('shows host recording alert', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingAlert(true, false, intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'You are recording',
                'Consider letting everyone know that this meeting is being recorded.',
                [{
                    text: 'Dismiss',
                }],
            );
        });

        it('should not show recording alert twice', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingAlert(true, false, intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'You are recording',
                'Consider letting everyone know that this meeting is being recorded.',
                [{
                    text: 'Dismiss',
                }],
            );

            mockAlert.mockClear();
            recordingAlert(true, false, intl as any);
            expect(mockAlert).not.toHaveBeenCalled();
        });

        it('shows participant recording alert', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingAlert(false, false, intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'Recording is in progress',
                'The host has started recording this meeting. By staying in the meeting you give consent to being recorded.',
                [
                    {
                        text: 'Leave',
                        onPress: expect.any(Function),
                        style: 'destructive',
                    },
                    {
                        text: 'Okay',
                        style: 'default',
                    },
                ],
            );
        });

        it('shows host transcription alert', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingAlert(true, true, intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'Recording and transcription has started',
                'Consider letting everyone know that this meeting is being recorded and transcribed.',
                [{
                    text: 'Dismiss',
                }],
            );
        });

        it('shows participant transcription alert', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingAlert(false, true, intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'Recording and transcription is in progress',
                'The host has started recording and transcription for this meeting. By staying in the meeting, you give consent to being recorded and transcribed.',
                [
                    {
                        text: 'Leave',
                        onPress: expect.any(Function),
                        style: 'destructive',
                    },
                    {
                        text: 'Okay',
                        style: 'default',
                    },
                ],
            );
        });

        it('calls leaveCall when Leave is pressed', () => {
            const {leaveCall} = require('@calls/actions');
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingAlert(false, false, intl as any);

            const leaveButton = mockAlert.mock.calls[0][2]![0];
            leaveButton.onPress?.();

            expect(leaveCall).toHaveBeenCalled();
        });
    });

    describe('stopRecordingConfirmationAlert', () => {
        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        };

        it('shows recording confirmation alert', async () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            const promise = stopRecordingConfirmationAlert(intl as any, false);

            expect(mockAlert).toHaveBeenCalledWith(
                'Stop recording',
                'The call recording will be processed and posted in the call thread. Are you sure you want to stop the recording?',
                [
                    {
                        text: 'Cancel',
                        onPress: expect.any(Function),
                        style: 'cancel',
                    },
                    {
                        text: 'Stop recording',
                        onPress: expect.any(Function),
                        style: 'destructive',
                    },
                ],
            );

            const confirmButton = mockAlert.mock.calls[0][2]![1];
            confirmButton.onPress?.();
            expect(await promise).toBe(true);
        });

        it('shows transcription confirmation alert', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            stopRecordingConfirmationAlert(intl as any, true);

            expect(mockAlert).toHaveBeenCalledWith(
                'Stop recording and transcription',
                'The call recording and transcription files will be processed and posted in the call thread. Are you sure you want to stop the recording and transcription?',
                expect.any(Array),
            );
        });
    });

    describe('recordingWillBePostedAlert', () => {
        beforeEach(() => {
            needsRecordingWillBePostedAlert();
        });

        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        };

        it('shows recording posted alert', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingWillBePostedAlert(intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'Recording has stopped. Processing...',
                'You can find the recording in this call\'s chat thread once it\'s finished processing.',
                [{
                    text: 'Dismiss',
                }],
            );
        });
    });

    describe('recordingErrorAlert', () => {
        beforeEach(() => {
            needsRecordingErrorAlert();
        });

        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        };

        it('shows recording error alert', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            recordingErrorAlert(intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'Something went wrong with the recording',
                'Please try to record again. You can also contact your system admin for troubleshooting help.',
                [{
                    text: 'Dismiss',
                }],
            );
        });
    });

    describe('removeFromCall', () => {
        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}, values?: any) => {
                if (values) {
                    return defaultMessage.replace('{displayName}', values.displayName);
                }
                return defaultMessage;
            },
        };

        it('shows remove confirmation and removes user', () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            removeFromCall('server1', 'test-user', 'call1', 'session1', intl as any);

            expect(mockAlert).toHaveBeenCalledWith(
                'Remove participant',
                'Are you sure you want to remove test-user from the call? ',
                [
                    {
                        text: 'Cancel',
                    },
                    {
                        text: 'Remove',
                        onPress: expect.any(Function),
                        style: 'destructive',
                    },
                ],
            );

            const removeButton = mockAlert.mock.calls[0][2]![1];
            removeButton.onPress?.();

            expect(hostRemove).toHaveBeenCalledWith('server1', 'call1', 'session1');
            expect(dismissBottomSheet).toHaveBeenCalled();
        });
    });

    describe('leaveAndJoinWithAlert', () => {
        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}, values?: any) => {
                if (values) {
                    return defaultMessage.replace('{leaveChannelName}', values.leaveChannelName).replace('{joinChannelName}', values.joinChannelName);
                }
                return defaultMessage;
            },
        };

        beforeAll(async () => {
            await DatabaseManager.init(['server1']);
        });

        beforeEach(() => {
            jest.clearAllMocks();
            const {getChannelById} = require('@queries/servers/channel');
            getChannelById.mockImplementation((db: any, channelId: string) => {
                if (channelId === 'join-channel') {
                    return {displayName: 'join-channel', type: 'D'};
                } else if (channelId === 'leave-channel') {
                    return {displayName: 'leave-channel'};
                }
                return null;
            });
        });

        it('joins new call when not in a call', async () => {
            const {getCallsState, getChannelsWithCalls, getCurrentCall, getCallsConfig, setMicPermissionsGranted} = require('@calls/state');
            getCallsState.mockReturnValue({
                enabled: {
                    'join-channel': true,
                },
            });
            getChannelsWithCalls.mockReturnValue({});
            getCurrentCall.mockReturnValue(null);
            getCallsConfig.mockReturnValue({});
            setMicPermissionsGranted.mockReturnValue(true);

            const mockAlert = jest.spyOn(Alert, 'alert');
            const result = await leaveAndJoinWithAlert(intl as any, 'server1', 'join-channel');
            expect(mockAlert).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('shows leave and join confirmation when in a call', async () => {
            const {getCallsState, getChannelsWithCalls, getCurrentCall, getCallsConfig, setMicPermissionsGranted} = require('@calls/state');
            getCallsState.mockReturnValue({
                enabled: {
                    'join-channel': true,
                },
            });
            getChannelsWithCalls.mockReturnValue({
                'leave-channel': 'call1',
                'join-channel': 'call2',
            });
            getCurrentCall.mockReturnValue({
                serverUrl: 'server1',
                channelId: 'leave-channel',
            });
            getCallsConfig.mockReturnValue({});
            setMicPermissionsGranted.mockReturnValue(true);

            const mockAlert = jest.spyOn(Alert, 'alert').mockImplementationOnce(async (title, message, buttons) => {
                // Simulate cancel
                await buttons![0].onPress?.();
            });

            expect(await leaveAndJoinWithAlert(intl as any, 'server1', 'join-channel')).toBe(false);

            console.log('rar');

            expect(mockAlert).toHaveBeenCalledWith(
                'Are you sure you want to switch to a different call?',
                'You are already on a channel call in ~leave-channel. Do you want to leave your current call and join the call in ~join-channel?',
                [
                    {
                        text: 'Cancel',
                        onPress: expect.any(Function),
                        style: 'destructive',
                    },
                    {
                        text: 'Leave & Join',
                        onPress: expect.any(Function),
                        isPreferred: true,
                    },
                ],
            );
        });

        it('shows leave and start confirmation when starting new call', async () => {
            const {getCallsState, getChannelsWithCalls, getCurrentCall, getCallsConfig, setMicPermissionsGranted} = require('@calls/state');
            getCallsState.mockReturnValue({
                enabled: {
                    'join-channel': true,
                },
            });
            getChannelsWithCalls.mockReturnValue({
                'leave-channel': 'call1',
            });
            getCurrentCall.mockReturnValue({
                serverUrl: 'server1',
                channelId: 'leave-channel',
            });
            getCallsConfig.mockReturnValue({});
            setMicPermissionsGranted.mockReturnValue(true);

            const mockAlert = jest.spyOn(Alert, 'alert').mockImplementationOnce((title, message, buttons) => {
                // Simulate confirm
                buttons![1].onPress?.();
            });

            expect(await leaveAndJoinWithAlert(intl as any, 'server1', 'join-channel')).toBe(true);

            expect(mockAlert).toHaveBeenCalledWith(
                'Are you sure you want to switch to a different call?',
                'You are already on a channel call in ~leave-channel. Do you want to leave your current call and start a new call in ~join-channel?',
                expect.any(Array),
            );
        });
    });

    describe('endCallConfirmationAlert', () => {
        const intl = {
            formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        };

        it('shows end call confirmation for non-host', async () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            const promise = endCallConfirmationAlert(intl as any, false);

            expect(mockAlert).toHaveBeenCalledWith(
                'Are you sure you want to leave this call?',
                '',
                expect.any(Array),
            );

            // Simulate leave
            const leaveButton = mockAlert.mock.calls[0][2]![1];
            leaveButton.onPress?.();
            expect(await promise).toBe(EndCallReturn.LeaveCall);
        });

        it('shows end call confirmation for host', async () => {
            const mockAlert = jest.spyOn(Alert, 'alert');
            const promise = endCallConfirmationAlert(intl as any, true);

            const buttons = mockAlert.mock.calls[0][2]!;
            expect(buttons).toHaveLength(3);
            expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'End call for everyone', 'Leave call']);

            // Simulate end call
            const endButton = buttons[1];
            endButton.onPress?.();
            expect(await promise).toBe(EndCallReturn.EndCall);
        });
    });
});
