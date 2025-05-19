// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';

import {removeDraft} from '@actions/local/draft';
import {updateScheduledPostErrorCode} from '@actions/local/scheduled_post';
import {createPost} from '@actions/remote/post';
import {deleteScheduledPost} from '@actions/remote/scheduled_post';
import {General, Screens} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {dismissBottomSheet} from '@screens/navigation';
import {act, fireEvent, renderWithEverything, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {sendMessageWithAlert} from '@utils/post';
import {canPostDraftInChannelOrThread} from '@utils/scheduled_post';

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

jest.mock('@utils/scheduled_post');

jest.mock('@actions/remote/post', () => ({
    deleteScheduledPost: jest.fn(),
    createPost: jest.fn(),
}));

jest.mock('@actions/local/scheduled_post', () => ({
    handleUpdateScheduledPostErrorCode: jest.fn(),
    updateScheduledPostErrorCode: jest.fn(),
}));
jest.mock('@database/manager');
jest.mock('@queries/servers/post');

describe('Send Draft', () => {
    let database: Database;
    const baseProps: Parameters<typeof SendDraft>[0] = {
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
        postPriority: {} as PostPriority,
        persistentNotificationInterval: 0,
        persistentNotificationMaxRecipients: 0,
        draftReceiverUserName: undefined,
        draftType: DRAFT_TYPE_DRAFT,
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const server = await TestHelper.setupServerDatabase(SERVER_URL);
        database = server.database;
    });

    it('should render the component', () => {
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...baseProps}
            />,
        );
        const {getByText} = wrapper;
        expect(getByText('Send draft')).toBeTruthy();
    });

    it('should call removeDraft when send draft is pressed for draft', async () => {
        jest.mocked(createPost).mockResolvedValueOnce({
            data: true,
        });
        jest.mocked(canPostDraftInChannelOrThread).mockResolvedValueOnce(true);
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...baseProps}
            />,
        );
        const {getByTestId} = wrapper;
        await act(async () => {
            fireEvent.press(getByTestId('send_draft_button'));
        });
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);

        expect(sendMessageWithAlert).toHaveBeenCalledWith(expect.objectContaining({
            sendMessageHandler: expect.any(Function),
        }));

        // Now execute the captured handler to simulate user confirming the send
        await act(async () => {
            jest.mocked(sendMessageWithAlert).mock.calls[0][0].sendMessageHandler();
        });

        expect(removeDraft).toHaveBeenCalled();
    });

    it('should call deleteScheduledPost when send button is pressed for scheduled post', async () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            postId: 'post_id',
        };

        jest.mocked(createPost).mockResolvedValueOnce({
            data: true,
        });
        jest.mocked(canPostDraftInChannelOrThread).mockResolvedValueOnce(true);
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByTestId} = wrapper;
        await act(async () => {
            fireEvent.press(getByTestId('send_draft_button'));
        });
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);

        expect(sendMessageWithAlert).toHaveBeenCalledWith(expect.objectContaining({
            sendMessageHandler: expect.any(Function),
        }));

        // Now execute the captured handler to simulate user confirming the send
        await act(async () => {
            jest.mocked(sendMessageWithAlert).mock.calls[0][0].sendMessageHandler();
        });

        expect(deleteScheduledPost).toHaveBeenCalled();
    });

    it('should call dismissBottomSheet after sending the draft and should call createPost', async () => {
        jest.mocked(canPostDraftInChannelOrThread).mockResolvedValueOnce(true);
        jest.mocked(sendMessageWithAlert).mockImplementation(() => {
            return Promise.resolve();
        });
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...baseProps}
            />,
        );
        const {getByTestId} = wrapper;
        await act(async () => {
            fireEvent.press(getByTestId('send_draft_button'));
        });
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);

        expect(sendMessageWithAlert).toHaveBeenCalledWith(expect.objectContaining({
            sendMessageHandler: expect.any(Function),
        }));

        // Now execute the captured handler to simulate user confirming the send
        await act(async () => {
            jest.mocked(sendMessageWithAlert).mock.calls[0][0].sendMessageHandler();
        });

        expect(createPost).toHaveBeenCalledWith(
            'https://server.com', {
                user_id: 'current_user_id',
                channel_id: 'channel_id',
                root_id: '',
                message: 'value',
            }, [],
        );
    });

    it('should render the component for scheduled post', () => {
        const props = {
            ...baseProps,
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
        jest.mocked(canPostDraftInChannelOrThread).mockResolvedValueOnce(true);

        const props: Parameters<typeof SendDraft>[0] = {
            ...baseProps,
            postPriority: {
                persistent_notifications: false,
                priority: '',
            },
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftType: DRAFT_TYPE_SCHEDULED,
            postId: 'post-id',
        };

        const {getByTestId} = renderWithEverything(<SendDraft {...props}/>, {database});

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
        expect(updateScheduledPostErrorCode).toHaveBeenCalledWith(
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
