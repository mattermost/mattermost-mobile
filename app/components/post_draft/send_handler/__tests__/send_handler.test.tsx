// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {General} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {sendMessageWithAlert} from '@utils/post';

import SendHandler from '../send_handler';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/channel', () => ({
    getChannelTimezones: jest.fn().mockResolvedValue({channelTimezones: []}),
}));

jest.mock('@utils/post', () => ({
    sendMessageWithAlert: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
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

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <SendHandler {...baseProps}/>, {database},
        );
        expect(wrapper.toJSON()).toBeTruthy();
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
            draftType: DRAFT_TYPE_DRAFT as DraftType,
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
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
        };
        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );
        expect(wrapper.getByTestId('send_draft_button')).toBeTruthy();
        expect(wrapper.getByText('Send')).toBeTruthy();
    });

    it('should handle post priority updates', async () => {
        const wrapper = renderWithEverything(
            <SendHandler
                {...baseProps}
                canShowPostPriority={true}
            />, {database},
        );

        const draftInput = wrapper.getByTestId('test_send_handler');
        expect(draftInput).toBeTruthy();
        expect(baseProps.postPriority.priority).toBe('urgent');
        await waitFor(() => {
            expect(wrapper.toJSON()).toBeTruthy();
        });
    });

    it('should pass correct props to SendDraft when in draft view', () => {
        const props = {
            ...baseProps,
            isFromDraftView: true,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
            channelDisplayName: 'Test Channel',
            draftReceiverUserName: 'test-user',
            postId: 'test-post-id',
        };

        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );

        const sendDraftButton = wrapper.getByTestId('send_draft_button');
        expect(sendDraftButton).toBeTruthy();
    });

    it('should handle send message action', async () => {
        const mockClearDraft = jest.fn();
        const props = {
            ...baseProps,
            value: 'test message',
            clearDraft: mockClearDraft,
        };

        const wrapper = renderWithEverything(
            <SendHandler {...props}/>, {database},
        );

        const draftInput = wrapper.getByTestId('test_send_handler');
        expect(draftInput).toBeTruthy();

        await waitFor(() => {
            expect(wrapper.toJSON()).toBeTruthy();
        });
    });

    it('should call sendMessageWithAlert with correct params when Send button clicked', async () => {
        const props = {
            ...baseProps,
            isFromDraftView: true,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
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
                title: expect.any(String),
                intl: expect.any(Object),
                sendMessageHandler: expect.any(Function),
            }));
        });
    });
});
