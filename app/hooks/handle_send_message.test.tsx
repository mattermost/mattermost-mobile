// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-lines */

import {renderHook, act} from '@testing-library/react-hooks';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';

import {getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {createScheduledPost} from '@actions/remote/scheduled_post';
import {handleCallsSlashCommand} from '@calls/actions';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import DraftUploadManager from '@managers/draft_upload_manager';
import {getPostById} from '@queries/servers/post';
import * as DraftUtils from '@utils/draft';

import {useHandleSendMessage} from './handle_send_message';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('@actions/remote/post');
jest.mock('@actions/remote/scheduled_post');
jest.mock('@actions/remote/channel', () => ({
    getChannelTimezones: jest.fn().mockResolvedValue({channelTimezones: []}),
}));
jest.mock('@actions/remote/command');
jest.mock('@actions/remote/reactions');
jest.mock('@actions/remote/user');
jest.mock('@calls/actions');
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('https://server.com'),
}));
jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));
jest.mock('@database/manager');
jest.mock('@queries/servers/post');

let operator: ServerDataOperator;
const database = {
    write: jest.fn(async (callback) => callback()),
};

describe('useHandleSendMessage', () => {
    const defaultProps = {
        value: 'test message',
        channelId: 'channel-id',
        rootId: '',
        maxMessageLength: 4000,
        files: [],
        customEmojis: [],
        enableConfirmNotificationsToChannel: true,
        useChannelMentions: true,
        membersCount: 3,
        userIsOutOfOffice: false,
        currentUserId: 'current-user',
        channelType: 'O',
        postPriority: {},
        clearDraft: jest.fn(),
    } as any;

    const wrapper = ({children}: {children: React.ReactNode}) => (
        <IntlProvider
            messages={{}}
            locale='en'
        >
            {children}
        </IntlProvider>
    );

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getChannelTimezones).mockResolvedValue({channelTimezones: []});
        jest.mocked(useServerUrl).mockReturnValue('https://server.com');
        jest.spyOn(DeviceEventEmitter, 'emit');
        jest.mocked(createPost).mockResolvedValue({
            data: true,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle basic message send', async () => {
        const {result} = renderHook(() => useHandleSendMessage(defaultProps), {wrapper});

        expect(result.current.canSend).toBe(true);

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(createPost).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                channel_id: 'channel-id',
                message: 'test message',
                user_id: 'current-user',
            }),
            [],
        );
        expect(defaultProps.clearDraft).toHaveBeenCalled();
        expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(Events.POST_LIST_SCROLL_TO_BOTTOM, Screens.CHANNEL);
    });

    it('should not allow sending when message exceeds length', () => {
        const props = {
            ...defaultProps,
            value: 'a'.repeat(4001),
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});
        expect(result.current.canSend).toBe(false);
    });

    it('should handle message with priority', async () => {
        const props = {
            ...defaultProps,
            postPriority: {
                priority: 'urgent',
                requested_ack: true,
            },
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(createPost).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                metadata: {
                    priority: {
                        priority: 'urgent',
                        requested_ack: true,
                    },
                },
            }),
            [],
        );
    });

    it('should emit thread event when sending reply', async () => {
        const props = {
            ...defaultProps,
            rootId: 'root-post-id',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(Events.POST_LIST_SCROLL_TO_BOTTOM, Screens.THREAD);
    });

    it('should not allow sending with uploading files', () => {
        const props = {
            ...defaultProps,
            files: [{clientId: 'file1', loading: true, failed: false}],
        };

        jest.spyOn(DraftUploadManager, 'isUploading').mockReturnValueOnce(true);

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});
        expect(result.current.canSend).toBe(false);
    });

    it('should handle failed file attachments', async () => {
        jest.spyOn(DraftUtils, 'alertAttachmentFail').mockImplementation((intl, accept) => {
            accept();
        });

        const props = {
            ...defaultProps,
            files: [{clientId: 'file1', failed: true}],
            value: 'test with failed attachment',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(DraftUtils.alertAttachmentFail).toHaveBeenCalled();
        expect(createPost).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                message: 'test with failed attachment',
            }),
            [], // Empty files array
        );
    });

    it('should handle reaction messages', async () => {
        const props = {
            ...defaultProps,
            value: '+:smile:',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(createPost).not.toHaveBeenCalled();
    });

    it('should handle slash commands', async () => {
        const mockExecuteCommand = jest.mocked(executeCommand);
        mockExecuteCommand.mockResolvedValueOnce({data: {}, error: null});

        const props = {
            ...defaultProps,
            value: '/away',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(executeCommand).toHaveBeenCalledWith(
            'https://server.com',
            expect.anything(),
            '/away',
            'channel-id',
            '',
        );
        expect(defaultProps.clearDraft).toHaveBeenCalled();
    });

    it('should handle slash command errors', async () => {
        const mockExecuteCommand = jest.mocked(executeCommand);
        mockExecuteCommand.mockResolvedValueOnce({data: undefined, error: new Error('Command failed')});
        jest.spyOn(DraftUtils, 'alertSlashCommandFailed');

        const props = {
            ...defaultProps,
            value: '/invalid-command',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(executeCommand).toHaveBeenCalled();
        expect(DraftUtils.alertSlashCommandFailed).toHaveBeenCalledWith(
            expect.anything(),
            'Command failed',
        );
        expect(defaultProps.clearDraft).not.toHaveBeenCalled();
    });

    it('should handle call command', async () => {
        const mockHandleCallsSlashCommand = jest.mocked(handleCallsSlashCommand);
        mockHandleCallsSlashCommand.mockResolvedValueOnce({handled: true});

        const props = {
            ...defaultProps,
            value: '/call start',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(handleCallsSlashCommand).toHaveBeenCalledWith(
            '/call start',
            'https://server.com',
            'channel-id',
            'O',
            '',
            'current-user',
            expect.anything(),
        );
        expect(defaultProps.clearDraft).toHaveBeenCalled();
    });

    it('should handle call command error', async () => {
        const mockHandleCallsSlashCommand = jest.mocked(handleCallsSlashCommand);
        mockHandleCallsSlashCommand.mockResolvedValueOnce({handled: false, error: 'Call error'});

        const props = {
            ...defaultProps,
            value: '/call invalid',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(handleCallsSlashCommand).toHaveBeenCalled();
        expect(DraftUtils.alertSlashCommandFailed).toHaveBeenCalledWith(
            expect.anything(),
            'Call error',
        );
    });

    it('should handle status command for out-of-office user', async () => {
        jest.spyOn(DraftUtils, 'getStatusFromSlashCommand').mockReturnValue('online');
        const mockConfirmOutOfOffice = jest.fn();
        jest.spyOn(require('@utils/user'), 'confirmOutOfOfficeDisabled').mockImplementation(mockConfirmOutOfOffice);

        const props = {
            ...defaultProps,
            value: '/online',
            userIsOutOfOffice: true,
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(mockConfirmOutOfOffice).toHaveBeenCalledWith(
            expect.anything(),
            'online',
            expect.any(Function),
        );
        expect(executeCommand).not.toHaveBeenCalled();
    });

    it('should handle goto location from command', async () => {
        const mockExecuteCommand = jest.mocked(executeCommand);
        mockExecuteCommand.mockResolvedValueOnce({
            data: {goto_location: 'http://example.com'},
            error: null,
        });

        const props = {
            ...defaultProps,
            value: '/goto command',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(handleGotoLocation).toHaveBeenCalledWith(
            'https://server.com',
            expect.anything(),
            'http://example.com',
        );
    });

    it('should handle scheduled post creation', async () => {
        const mockCreateScheduledPost = jest.mocked(createScheduledPost);
        mockCreateScheduledPost.mockResolvedValueOnce({data: true});

        const schedulingInfo = {
            scheduled_at: 1234567890,
            timezone: 'UTC',
        };

        const props = {
            ...defaultProps,
            value: 'scheduled message',
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            await result.current.handleSendMessage(schedulingInfo);
        });

        expect(mockCreateScheduledPost).toHaveBeenCalledWith(
            'https://server.com',
            expect.objectContaining({
                message: 'scheduled message',
                scheduled_at: 1234567890,
            }),
        );
        expect(defaultProps.clearDraft).toHaveBeenCalled();
    });

    it('should fetch and handle channel timezones', async () => {
        jest.mocked(getChannelTimezones).mockResolvedValueOnce({
            channelTimezones: ['UTC', 'America/New_York'],
        });

        const props = {
            ...defaultProps,
            value: '@channel message',
            enableConfirmNotificationsToChannel: true,
            useChannelMentions: true,
            membersCount: 25,
        };

        renderHook(() => useHandleSendMessage(props), {wrapper});

        expect(getChannelTimezones).toHaveBeenCalledWith(
            'https://server.com',
            'channel-id',
        );
    });

    it('should handle channel-wide mentions confirmation', async () => {
        jest.spyOn(DraftUtils, 'textContainsAtAllAtChannel').mockReturnValue(true);
        jest.spyOn(DraftUtils, 'alertChannelWideMention');

        const props = {
            ...defaultProps,
            value: '@channel message',
            membersCount: 25,
            enableConfirmNotificationsToChannel: true,
            useChannelMentions: true,
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(DraftUtils.alertChannelWideMention).toHaveBeenCalled();
        expect(createPost).not.toHaveBeenCalled();
    });
    it('should include post priority metadata', async () => {
        const props = {
            ...defaultProps,
            value: 'priority message',
            postPriority: {
                priority: 'urgent',
                requested_ack: true,
                persistent_notifications: true,
            },
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            await result.current.handleSendMessage();
        });

        expect(createPost).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                metadata: {
                    priority: {
                        priority: 'urgent',
                        requested_ack: true,
                        persistent_notifications: true,
                    },
                },
            }),
            [],
        );
    });

    it('should not include priority metadata for replies', async () => {
        const props = {
            ...defaultProps,
            value: 'reply message',
            rootId: 'some-root-id',
            postPriority: {
                priority: 'urgent',
                requested_ack: true,
            },
        };

        const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

        await act(async () => {
            await result.current.handleSendMessage();
        });

        expect(createPost).toHaveBeenCalledWith(
            expect.any(String),
            expect.not.objectContaining({
                metadata: expect.anything(),
            }),
            [],
        );
    });

    describe('message length validation', () => {
        it('should not allow empty messages', () => {
            const props = {
                ...defaultProps,
                value: '',
            };
            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});
            expect(result.current.canSend).toBe(false);
        });

        it('should not allow whitespace-only messages', () => {
            const props = {
                ...defaultProps,
                value: '   ',
            };
            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});
            expect(result.current.canSend).toBe(false);
        });

        it('should allow messages within length limit', () => {
            const props = {
                ...defaultProps,
                value: 'valid message',
                maxMessageLength: 100,
            };
            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});
            expect(result.current.canSend).toBe(true);
        });
    });

    describe('file upload handling', () => {
        it('should allow sending when all files are uploaded', () => {
            jest.spyOn(DraftUploadManager, 'isUploading').mockReturnValue(false);
            const props = {
                ...defaultProps,
                value: 'message with files',
                files: [{clientId: 'file1', loading: false}],
            };
            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});
            expect(result.current.canSend).toBe(true);
        });

        it('should block sending during file upload', () => {
            jest.spyOn(DraftUploadManager, 'isUploading').mockReturnValue(true);
            const props = {
                ...defaultProps,
                value: 'message with uploading file',
                files: [{clientId: 'file1', loading: true}],
            };
            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});
            expect(result.current.canSend).toBe(false);
        });
    });

    describe('channel mentions handling', () => {
        it('should bypass mention confirmation when disabled', async () => {
            const props = {
                ...defaultProps,
                value: '@channel message',
                enableConfirmNotificationsToChannel: false,
                membersCount: 25,
            };

            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

            await act(async () => {
                await result.current.handleSendMessage();
            });

            expect(createPost).toHaveBeenCalled();
            expect(DraftUtils.alertChannelWideMention).not.toHaveBeenCalled();
        });

        it('should bypass mention confirmation for small channels', async () => {
            const props = {
                ...defaultProps,
                value: '@channel message',
                enableConfirmNotificationsToChannel: true,
                membersCount: 5,
            };

            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

            await act(async () => {
                await result.current.handleSendMessage();
            });

            expect(createPost).toHaveBeenCalled();
            expect(DraftUtils.alertChannelWideMention).not.toHaveBeenCalled();
        });
    });

    describe('command handling', () => {
        beforeEach(() => {
            jest.mocked(createScheduledPost).mockResolvedValueOnce({
                data: true,
            });
        });

        it('should bypass command handling for scheduled messages', async () => {
            const props = {
                ...defaultProps,
                value: '/away',
            };

            const schedulingInfo = {
                scheduled_at: 1234567890,
                timezone: 'UTC',
            };

            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

            await act(async () => {
                await result.current.handleSendMessage(schedulingInfo);
            });

            expect(executeCommand).not.toHaveBeenCalled();
            expect(createScheduledPost).toHaveBeenCalled();
        });
    });

    describe('handle error while failing creating post from scheduled post and draft', () => {
        const serverUrl = 'baseHandler.test.com';
        beforeEach(async () => {
            jest.clearAllMocks();
            await DatabaseManager.init([serverUrl]);
            operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
            DatabaseManager.getServerDatabaseAndOperator = jest.fn();
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockReturnValue({
                database,
                operator,
            });
        });

        it('should show alert when root post is not found', async () => {
            jest.mocked(getPostById).mockResolvedValueOnce(undefined);

            const props = {
                ...defaultProps,
                isFromDraftView: true,
                rootId: 'root-post-id',
                value: 'test message',
            };

            const {result} = renderHook(() => useHandleSendMessage(props), {wrapper});

            await act(async () => {
                await result.current.handleSendMessage();
            });

            expect(Alert.alert).toHaveBeenCalledWith(
                'Sending post failed',
                'Someone delete the message on which you tried to post a comment.',
                [{text: 'Cancel', style: 'cancel'}],
                {cancelable: false},
            );

            expect(defaultProps.clearDraft).not.toHaveBeenCalled();
        });
    });
});
