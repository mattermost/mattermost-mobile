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
        it('renders base components', async () => {
            const {getByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});
            expect(getByTestId('draft_input')).toBeVisible();
            expect(getByTestId('draft_input.post.input')).toBeVisible();
            expect(getByTestId('draft_input.quick_actions')).toBeVisible();
            expect(getByTestId('draft_input.send_action.send.button')).toBeVisible();
        });

        it('shows upload error when present', () => {
            const props = {...baseProps, uploadFileError: 'Error message'};
            const {getByText} = renderWithEverything(<DraftInput {...props}/>, {database});
            expect(getByText('Error message')).toBeVisible();
        });
    });

    describe('Message Actions', () => {
        it('sends message on press', () => {
            const {getByTestId} = renderWithEverything(<DraftInput {...baseProps}/>, {database});
            fireEvent.press(getByTestId('draft_input.send_action.send.button'));
            expect(baseProps.sendMessage).toHaveBeenCalled();
        });

        it('opens scheduled post options on long press', async () => {
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
            }));
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
        });
    });
});
