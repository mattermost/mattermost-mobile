// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {PostPriorityType} from '@constants/post';
import NetworkManager from '@managers/network_manager';
import {openAsBottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {persistentNotificationsConfirmation} from '@utils/post';

import DraftInput from './draft_input';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const SERVER_URL = 'https://appv1.mattermost.com';

// this is needed to when using the useServerUrl hook
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => SERVER_URL),
}));

jest.mock('@screens/navigation', () => ({
    openAsBottomSheet: jest.fn(),
}));

jest.mock('@utils/post', () => ({
    persistentNotificationsConfirmation: jest.fn(),
}));

describe('DraftInput', () => {
    const baseProps = {
        testID: 'draft_input',
        channelId: 'channelId',
        channelType: 'O' as ChannelType,
        currentUserId: 'currentUserId',
        postPriority: {priority: ''} as PostPriority,
        updatePostPriority: jest.fn(),
        persistentNotificationInterval: 0,
        persistentNotificationMaxRecipients: 0,
        updateCursorPosition: jest.fn(),
        cursorPosition: 0,
        sendMessage: jest.fn(),
        canSend: true,
        maxMessageLength: 4000,
        files: [],
        value: '',
        uploadFileError: null,
        updateValue: jest.fn(),
        addFiles: jest.fn(),
        updatePostInputTop: jest.fn(),
        setIsFocused: jest.fn(),
        scheduledPostsEnabled: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(SERVER_URL);
        database = server.database;
        operator = server.operator;
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(SERVER_URL);
    });

    describe('Rendering', () => {
        it('renders all required components', async () => {
            const {getByTestId, queryByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});

            // Main container
            const container = getByTestId('draft_input');
            expect(container).toBeVisible();

            // Input field
            const input = getByTestId('draft_input.post.input');
            expect(input).toBeVisible();

            // Quick actions
            const quickActions = getByTestId('draft_input.quick_actions');
            expect(quickActions).toBeVisible();

            // Send button
            const sendButton = getByTestId('draft_input.send_action.send.button');
            expect(sendButton).toBeVisible();
            expect(sendButton).not.toBeDisabled();

            // Should not show disabled send button
            const disabledSend = queryByTestId('draft_input.send_action.send.button.disabled');
            expect(disabledSend).toBeNull();
        });

        it('shows upload error with correct message', () => {
            const errorMsg = 'Test error message';
            const props = {...baseProps, uploadFileError: errorMsg};
            const {getByText, getByTestId} = renderWithEverything(<DraftInput {...props}/>, {database});

            const error = getByText(errorMsg);
            expect(error).toBeVisible();

            // Error should be within uploads section
            const uploadsSection = getByTestId('uploads');
            expect(uploadsSection).toContainElement(error);
        });
    });

    describe('Message Actions', () => {
        it('sends message on press', () => {
            const {getByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});
            fireEvent.press(getByTestId('draft_input.send_action.send.button'));
            expect(baseProps.sendMessage).toHaveBeenCalledWith(undefined);
        });

        it('opens scheduled post options on long press and verify action', async () => {
            jest.mocked(openAsBottomSheet).mockImplementation(({props}) => props!.onSchedule({scheduled_at: 100} as SchedulingInfo));

            // make this a re-usable function
            await operator.handleConfigs({
                configs: [
                    {id: 'ScheduledPosts', value: 'true'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});
            fireEvent(getByTestId('draft_input.send_action.send.button'), 'longPress');
            expect(openAsBottomSheet).toHaveBeenCalledWith(expect.objectContaining({
                screen: Screens.SCHEDULED_POST_OPTIONS,
                closeButtonId: 'close-scheduled-post-picker',
            }));
            expect(baseProps.sendMessage).toHaveBeenCalledWith({scheduled_at: 100});
        });

        it('should not open scheduled post options if scheduled post are disabled', async () => {
            jest.mocked(openAsBottomSheet).mockImplementation(({props}) => props!.onSchedule({scheduled_at: 100} as SchedulingInfo));
            const props = {
                ...baseProps,
                scheduledPostsEnabled: false,
            };

            const {getByTestId} = renderWithEverything(<DraftInput {...props}/>, {database});
            fireEvent(getByTestId('draft_input.send_action.send.button'), 'longPress');
            expect(openAsBottomSheet).not.toHaveBeenCalled();
            expect(baseProps.sendMessage).not.toHaveBeenCalled();
        });

        it('handles persistent notifications', async () => {
            jest.mocked(persistentNotificationsConfirmation).mockResolvedValueOnce();
            const props = {
                ...baseProps,
                postPriority: {
                    persistent_notifications: true,
                    priority: PostPriorityType.URGENT,
                } as PostPriority,
                value: '@user1 @user2 message',
            };

            const {getByTestId} = renderWithEverything(<DraftInput {...props}/>, {database});
            fireEvent.press(getByTestId('draft_input.send_action.send.button'));
            expect(persistentNotificationsConfirmation).toHaveBeenCalled();
        });
    });

    describe('Input Handling', () => {
        it('updates text value', () => {
            const {getByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});
            fireEvent.changeText(getByTestId('draft_input.post.input'), 'new message');
            expect(baseProps.updateValue).toHaveBeenCalledWith('new message');
        });

        it('handles cursor position', () => {
            const {getByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});
            fireEvent(getByTestId('draft_input.post.input'), 'selectionChange', {
                nativeEvent: {selection: {start: 5, end: 5}},
            });
            expect(baseProps.updateCursorPosition).toHaveBeenCalledWith(5);
        });

        it('updates focus state', () => {
            const {getByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});
            fireEvent(getByTestId('draft_input.post.input'), 'focus');
            expect(baseProps.setIsFocused).toHaveBeenCalledWith(true);
        });
    });

    describe('Validation', () => {
        it('disables send when canSend is false', () => {
            const props = {...baseProps, canSend: false};
            const {getByTestId} = renderWithEverything(<DraftInput {...props}/>, {database});
            const sendButton = getByTestId('draft_input.send_action.send.button.disabled');
            expect(sendButton).toBeVisible();
            expect(sendButton).toBeDisabled();

            fireEvent(sendButton, 'longPress');
            expect(baseProps.sendMessage).not.toHaveBeenCalled();

            fireEvent.press(sendButton);
            expect(baseProps.sendMessage).not.toHaveBeenCalled();
        });
    });
});
