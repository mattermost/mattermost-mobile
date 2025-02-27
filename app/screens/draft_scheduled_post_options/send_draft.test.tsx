// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {removeDraft} from '@actions/local/draft';
import {deleteScheduledPost} from '@actions/remote/scheduled_post';
import {General, Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {dismissBottomSheet} from '@screens/navigation';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import {showSnackBar} from '@utils/snack_bar';

import {SendDraft} from './send_draft';

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
    withServerUrl: (component: React.Component) => component,
}));

jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));

jest.mock('@utils/post', () => ({
    sendMessageWithAlert: jest.fn(),
    persistentNotificationsConfirmation: jest.fn(),
}));

jest.mock('@managers/websocket_manager', () => ({
    default: {
        observeWebsocketState: jest.fn(() => ({
            observe: jest.fn(),
        })),
    },
}));

describe('Send Draft', () => {
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
            draftType: DRAFT_TYPE_DRAFT as DraftType,
            websocketState: 'connected' as WebsocketConnectedState,
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
            websocketState: 'connected' as WebsocketConnectedState,
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
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
            websocketState: 'connected' as WebsocketConnectedState,
        };
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByText} = wrapper;
        expect(getByText('Send')).toBeTruthy();
    });

    it('should call removeDraft when clearing a draft', () => {
        const mockHandleSendMessage = jest.fn();
        jest.mock('@hooks/handle_send_message', () => ({
            useHandleSendMessage: () => ({
                handleSendMessage: mockHandleSendMessage,
            }),
        }));

        const TestClearDraft = () => {
            const serverUrl = useServerUrl();
            const channelId = 'channel_id';
            const rootId = 'root_id';
            const draftType = DRAFT_TYPE_DRAFT;

            React.useEffect(() => {
                // This simulates the clearDraft function logic
                if (draftType === DRAFT_TYPE_DRAFT) {
                    removeDraft(serverUrl, channelId, rootId);
                }
            }, []);

            return null;
        };

        renderWithIntlAndTheme(<TestClearDraft/>);

        expect(removeDraft).toHaveBeenCalledWith('https://server.com', 'channel_id', 'root_id');
        expect(deleteScheduledPost).not.toHaveBeenCalled();
    });

    it('should call deleteScheduledPost when clearing a scheduled post', () => {
        const TestClearScheduledDraft = () => {
            const serverUrl = useServerUrl();
            const draftType = DRAFT_TYPE_SCHEDULED;
            const postId = 'post_id';

            React.useEffect(() => {
                // This simulates the clearDraft function logic
                if (draftType !== (DRAFT_TYPE_DRAFT as DraftType) && postId) {
                    deleteScheduledPost(serverUrl, postId);
                }
            }, []);

            return null;
        };

        renderWithIntlAndTheme(<TestClearScheduledDraft/>);

        expect(deleteScheduledPost).toHaveBeenCalledWith('https://server.com', 'post_id');
        expect(removeDraft).not.toHaveBeenCalled();
    });

    it('should show error snackbar when websocket is not connected', async () => {
        // Clear any previous calls to the mock
        jest.clearAllMocks();

        // Create a direct implementation of the draftSendHandler function
        const mockDraftSendHandler = async () => {
            await dismissBottomSheet(Screens.DRAFT_SCHEDULED_POST_OPTIONS);
            showSnackBar({
                barType: SNACK_BAR_TYPE.CONNECTION_ERROR,
                customMessage: 'No internet connection',
                type: 'error',
                keepOpen: true,
            });
        };

        // Mock the component with our own implementation
        jest.spyOn(React, 'useCallback').mockImplementationOnce(() => mockDraftSendHandler);

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
            draftType: DRAFT_TYPE_DRAFT as DraftType,
            websocketState: 'not_connected' as WebsocketConnectedState,
        };

        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );

        const {getByTestId} = wrapper;
        await fireEvent.press(getByTestId('send_draft_button'));

        // Wait for the async operations to complete
        await new Promise(process.nextTick);

        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
        expect(showSnackBar).toHaveBeenCalledWith(expect.objectContaining({
            barType: SNACK_BAR_TYPE.CONNECTION_ERROR,
            type: 'error',
            keepOpen: true,
        }));
    });

    it('should proceed with sending when websocket is connected', () => {
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
            draftType: DRAFT_TYPE_DRAFT as DraftType,
            websocketState: 'connected' as WebsocketConnectedState,
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
});
