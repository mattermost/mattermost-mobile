// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {handleCallsSlashCommand} from '@calls/actions';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import DraftUploadManager from '@managers/draft_upload_manager';
import * as DraftUtils from '@utils/draft';

import {useHandleSendMessage} from './handle_send_message';

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('@actions/remote/post');
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

    it('should not allow sending while already sending', async () => {
        const {result} = renderHook(() => useHandleSendMessage(defaultProps), {wrapper});

        // Trigger first send
        await act(async () => {
            result.current.handleSendMessage();
        });

        // Try to send again immediately
        await act(async () => {
            result.current.handleSendMessage();
        });

        expect(createPost).toHaveBeenCalledTimes(1);
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
});
