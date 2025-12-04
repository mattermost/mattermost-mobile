// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {removeDraft} from '@actions/local/draft';
import {createPost} from '@actions/remote/post';
import {General} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {sendMessageWithAlert} from '@utils/post';
import {canPostDraftInChannelOrThread} from '@utils/scheduled_post';

import SendHandler from './send_handler';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/post');
jest.mock('@actions/remote/channel', () => ({
    getChannelTimezones: jest.fn().mockResolvedValue({channelTimezones: []}),
}));

jest.mock('@utils/post', () => ({
    sendMessageWithAlert: jest.fn(),
    persistentNotificationsConfirmation: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@actions/local/draft', () => ({
    removeDraft: jest.fn(),
}));

jest.mock('@actions/remote/post', () => ({
    createPost: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));

jest.mock('@utils/scheduled_post', () => ({
    canPostDraftInChannelOrThread: jest.fn(),
}));

describe('components/post_draft/send_handler/SendHandler', () => {
    let database: Database;
    const baseProps = {
        testID: 'test_send_handler',
        channelId: 'channel-id',
        channelType: General.OPEN_CHANNEL,
        channelName: 'test-channel',
        rootId: '',
        currentUserId: 'current-user-id',
        cursorPosition: 0,
        enableConfirmNotificationsToChannel: true,
        maxMessageLength: 4000,
        membersCount: 3,
        useChannelMentions: true,
        userIsOutOfOffice: false,
        customEmojis: [],
        value: '',
        files: [],
        clearDraft: jest.fn(),
        updateValue: jest.fn(),
        updateCursorPosition: jest.fn(),
        updatePostInputTop: jest.fn(),
        addFiles: jest.fn(),
        uploadFileError: null,
        setIsFocused: jest.fn(),
        persistentNotificationInterval: 0,
        persistentNotificationMaxRecipients: 5,
        postPriority: {
            priority: 'urgent',
            requested_ack: false,
            persistent_notifications: false,
        } as PostPriority,
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render DraftInput when not from draft view', () => {
        const wrapper = renderWithEverything(
            <SendHandler {...baseProps}/>, {database},
        );
        expect(wrapper.getByTestId('test_send_handler')).toBeTruthy();
    });

    it('should render SendDraft when from draft view', () => {
        const props = {
            ...baseProps,
            isFromDraftView: true,
            draftType: DRAFT_TYPE_DRAFT,
        };
        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );
        expect(wrapper.getByTestId('send_draft_button')).toBeTruthy();
        expect(wrapper.getByText('Send draft')).toBeTruthy();
    });

    it('should render Send text when draft type is scheduled', () => {
        const props = {
            ...baseProps,
            isFromDraftView: true,
            draftType: DRAFT_TYPE_SCHEDULED,
        };
        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );
        expect(wrapper.getByTestId('send_draft_button')).toBeTruthy();
        expect(wrapper.getByText('Send')).toBeTruthy();
    });

    it('should show correct post priority', async () => {
        const wrapper = renderWithEverything(
            <SendHandler
                {...baseProps}
                canShowPostPriority={true}
            />, {database},
        );

        expect(wrapper.getByTestId('test_send_handler')).toBeTruthy();
        expect(wrapper.getByText('URGENT')).toBeTruthy();
    });

    it('should pass correct props to SendDraft component when in draft view', async () => {
        const props = {
            ...baseProps,
            isFromDraftView: true,
            draftType: DRAFT_TYPE_DRAFT,
            channelDisplayName: 'Test Channel',
            draftReceiverUserName: 'test-user',
            postId: 'test-post-id',
            value: 'test message',
        };

        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );

        // Verify the SendDraft button is rendered with correct text
        const sendDraftButton = wrapper.getByTestId('send_draft_button');
        expect(sendDraftButton).toBeTruthy();
        expect(wrapper.getByText('Send draft')).toBeTruthy();

        // Manually trigger the button press
        fireEvent.press(sendDraftButton);

        await waitFor(() => expect(sendMessageWithAlert).toHaveBeenCalled());

        // Reset the mock for the next test
        jest.clearAllMocks();

        // Test with empty message to verify disabled state
        const emptyProps = {
            ...props,
            value: '',
            files: [],
        };

        wrapper.rerender(
            <SendHandler {...emptyProps}/>,
        );

        // Button should still exist but pressing it should not trigger send when empty
        const emptyButton = wrapper.getByTestId('send_draft_button');
        expect(emptyButton).toBeTruthy();

        fireEvent.press(emptyButton);
        await waitFor(() => expect(sendMessageWithAlert).not.toHaveBeenCalled());
    });

    it('should call sendMessageWithAlert with correct params when Send button clicked', async () => {
        const props = {
            ...baseProps,
            isFromDraftView: true,
            draftType: DRAFT_TYPE_DRAFT,
            channelName: 'test-channel',
            value: 'test message',
            postPriority: {
                persistent_notifications: false,
            } as PostPriority,
        };

        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );

        const sendButton = wrapper.getByTestId('send_draft_button');
        expect(sendButton).toBeTruthy();

        await act(async () => {
            fireEvent.press(sendButton);
        });

        await waitFor(() => {
            expect(sendMessageWithAlert).toHaveBeenCalledWith(expect.objectContaining({
                channelName: 'test-channel',
                title: 'Send message now',
                intl: expect.any(Object),
                sendMessageHandler: expect.any(Function),
            }));
        });
    });

    it('should execute sendMessageHandler when send_draft_button is clicked', async () => {
        // Mock implementation to capture the sendMessageHandler
        let capturedHandler: Function;
        jest.mocked(sendMessageWithAlert).mockImplementation((params) => {
            capturedHandler = params.sendMessageHandler;
            return Promise.resolve();
        });
        jest.mocked(createPost).mockResolvedValueOnce({
            data: true,
        });
        jest.mocked(canPostDraftInChannelOrThread).mockResolvedValueOnce(true);

        const props = {
            ...baseProps,
            isFromDraftView: true,
            draftType: DRAFT_TYPE_DRAFT,
            value: 'test message',
        };

        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );

        // Find and press the send button
        const sendButton = wrapper.getByTestId('send_draft_button');

        await act(async () => {
            fireEvent.press(sendButton);
        });

        // Verify sendMessageWithAlert was called
        expect(sendMessageWithAlert).toHaveBeenCalledWith(expect.objectContaining({
            sendMessageHandler: expect.any(Function),
        }));

        // Now execute the captured handler to simulate user confirming the send
        await act(async () => {
            await capturedHandler();
        });

        // Varify removeDraft function is been called.
        expect(removeDraft).toHaveBeenCalled();
    });
});
