// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';

import {handleUpdateScheduledPostErrorCode} from '@actions/local/scheduled_post';
import {createPost} from '@actions/remote/post';
import {deleteScheduledPost} from '@actions/remote/scheduled_post';
import {General, Screens} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@screens/global_drafts/constants';
import {dismissBottomSheet} from '@screens/navigation';
import {act, fireEvent, renderWithEverything, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {sendMessageWithAlert} from '@utils/post';

import SendDraft from './send_draft';

import type {Database} from '@nozbe/watermelondb';

const SERVER_URL = 'https://www.baseUrl.com';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@actions/local/draft', () => ({
    removeDraft: jest.fn(),
}));

jest.mock('@actions/remote/scheduled_post', () => ({
    deleteScheduledPost: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://server.com'),
}));

jest.mock('@utils/post', () => ({
    sendMessageWithAlert: jest.fn(),
    persistentNotificationsConfirmation: jest.fn(),
}));

jest.mock('@actions/remote/post', () => ({
    deleteScheduledPost: jest.fn(),
    createPost: jest.fn(),
}));

jest.mock('@actions/local/scheduled_post', () => ({
    handleUpdateScheduledPostErrorCode: jest.fn(),
}));

describe('Send Draft', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        const server = await TestHelper.setupServerDatabase(SERVER_URL);
        database = server.database;
    });

    it('should render the component', () => {
        const props = {
            channelId: 'channel_id',
            channelName: 'channel_name',
            rootId: '',
            channelType: General.OPEN_CHANNEL,
            bottomSheetId: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            currentUserId: 'current_user_id',
            maxMessageLength: 4000,
            useChannelMentions: true,
            userIsOutOfOffice: false,
            customEmojis: [],
            value: 'value',
            files: [],
            postPriority: '' as unknown as PostPriority,
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_DRAFT,
        };
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByText} = wrapper;
        expect(getByText('Send draft')).toBeTruthy();
    });

    it('should call dismissBottomSheet after sending the draft', () => {
        const props = {
            channelId: 'channel_id',
            channelName: 'channel_name',
            rootId: '',
            channelType: General.OPEN_CHANNEL,
            bottomSheetId: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            currentUserId: 'current_user_id',
            maxMessageLength: 4000,
            useChannelMentions: true,
            userIsOutOfOffice: false,
            customEmojis: [],
            value: 'value',
            files: [],
            postPriority: '' as unknown as PostPriority,
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftReceiverUserName: undefined,
        };
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByTestId} = wrapper;
        fireEvent.press(getByTestId('send_draft_button'));
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('should render the component for scheduled post', () => {
        const props = {
            channelId: 'channel_id',
            channelName: 'channel_name',
            rootId: '',
            channelType: General.OPEN_CHANNEL,
            bottomSheetId: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            currentUserId: 'current_user_id',
            maxMessageLength: 4000,
            useChannelMentions: true,
            userIsOutOfOffice: false,
            customEmojis: [],
            value: 'value',
            files: [],
            postPriority: '' as unknown as PostPriority,
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_SCHEDULED,
        };
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByText} = wrapper;
        expect(getByText('Send')).toBeTruthy();
    });

    test('should handle deleteScheduledPost failure and call handleUpdateScheduledPostErrorCode', async () => {
        const mockError = new Error('Failed to delete scheduled post');
        jest.mocked(deleteScheduledPost).mockResolvedValue({error: mockError});
        jest.mocked(sendMessageWithAlert).mockImplementation(() => {
            return Promise.resolve();
        });
        jest.mocked(createPost).mockResolvedValueOnce({
            data: true,
        });

        const baseProps: Parameters<typeof SendDraft>[0] = {
            channelId: 'channel-id',
            rootId: 'root-id',
            channelType: 'O',
            currentUserId: 'user-id',
            channelName: 'channel-name',
            channelDisplayName: 'Channel Display Name',
            enableConfirmNotificationsToChannel: true,
            maxMessageLength: 4000,
            membersCount: 3,
            useChannelMentions: true,
            userIsOutOfOffice: false,
            customEmojis: [],
            value: 'test message',
            files: [],
            postPriority: {
                persistent_notifications: false,
                priority: '',
            },
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftType: 'scheduled',
            postId: 'post-id',
        };

        const {getByTestId} = renderWithEverything(<SendDraft {...baseProps}/>, {database});

        // Trigger the send action
        await act(async () => {
            fireEvent.press(getByTestId('send_draft_button'));
        });

        // Verify dismissBottomSheet was called
        expect(dismissBottomSheet).toHaveBeenCalled();

        expect(sendMessageWithAlert).toHaveBeenCalledWith(expect.objectContaining({
            sendMessageHandler: expect.any(Function),
        }));

        // Now execute the captured handler to simulate user confirming the send
        await act(async () => {
            jest.mocked(sendMessageWithAlert).mock.calls[0][0].sendMessageHandler();
        });

        // Verify deleteScheduledPost was called with correct params
        expect(deleteScheduledPost).toHaveBeenCalledWith(
            'https://server.com',
            'post-id',
        );

        // Verify handleUpdateScheduledPostErrorCode was called with correct params
        expect(handleUpdateScheduledPostErrorCode).toHaveBeenCalledWith(
            'https://server.com',
            'post-id',
            'post_send_success_delete_failed',
        );

        // Verify Alert was called with error message
        expect(Alert.alert).toHaveBeenCalledWith(
            'Delete fails',
            'Post has been create successfully but failed to delete. Please delete the scheduled post manually from the scheduled post list.',
            [{
                style: 'cancel',
                text: 'Cancel',
            }],
            {cancelable: false},
        );
    });
});
