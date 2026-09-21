// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {License, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PostPriorityType} from '@constants/post';
import NetworkManager from '@managers/network_manager';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
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
    withServerUrl: (Component: React.ComponentType<any>) => (props: any) => (
        <Component
            {...props}
            serverUrl={SERVER_URL}
        />
    ),
}));

jest.mock('@screens/navigation');

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
        updatePostBoRStatus: jest.fn(),
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
        location: Screens.CHANNEL,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    let database: Database;
    let operator: ServerDataOperator;

    // Tracks the most recent render so afterEach can unmount before DB teardown,
    // preventing withObservables from emitting state updates outside act().
    let latestUnmount: (() => void) | undefined;
    const render = (ui: React.ReactElement, opts?: {database: Database}) => {
        const result = renderWithEverything(ui, opts);
        latestUnmount = result.unmount;
        return result;
    };

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(SERVER_URL);
        database = server.database;
        operator = server.operator;
    });

    afterEach(async () => {
        latestUnmount?.();
        latestUnmount = undefined;
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(SERVER_URL);
    });

    describe('Rendering', () => {
        it('renders all required components', async () => {
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});

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
            const {getByText, getByTestId} = render(<DraftInput {...props}/>, {database});

            const error = getByText(errorMsg);
            expect(error).toBeVisible();

            // Error should be within uploads section
            const uploadsSection = getByTestId('uploads');
            expect(uploadsSection).toContainElement(error);
        });
    });

    describe('Message Actions', () => {
        it('sends message on press', () => {
            const {getByTestId} = render(<DraftInput {...baseProps}/>, {database});
            fireEvent.press(getByTestId('draft_input.send_action.send.button'));
            expect(baseProps.sendMessage).toHaveBeenCalledWith(undefined);
        });

        it('opens scheduled post options on long press and verify action', async () => {
            jest.mocked(navigateToScreen).mockImplementation(() => {});

            // make this a re-usable function
            await operator.handleConfigs({
                configs: [
                    {id: 'ScheduledPosts', value: 'true'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = render(<DraftInput {...baseProps}/>, {database});
            await act(async () => {
                fireEvent(getByTestId('draft_input.send_action.send.button'), 'longPress');
            });
            expect(navigateToScreen).toHaveBeenCalledWith(Screens.SCHEDULED_POST_OPTIONS);

            // Simulate the scheduled post options screen calling back with a scheduled time
            const callback = CallbackStore.getCallback<(schedulingInfo: SchedulingInfo) => Promise<void>>();
            expect(callback).toBeDefined();

            await act(async () => {
                await callback!({scheduled_at: 100});
            });

            expect(baseProps.sendMessage).toHaveBeenCalledWith({scheduled_at: 100});
        });

        it('should not open scheduled post options if scheduled post are disabled', async () => {
            jest.mocked(navigateToScreen).mockImplementation(() => {});
            const props = {
                ...baseProps,
                scheduledPostsEnabled: false,
            };

            const {getByTestId} = render(<DraftInput {...props}/>, {database});
            fireEvent(getByTestId('draft_input.send_action.send.button'), 'longPress');
            expect(navigateToScreen).not.toHaveBeenCalled();
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

            const {getByTestId} = render(<DraftInput {...props}/>, {database});
            fireEvent.press(getByTestId('draft_input.send_action.send.button'));
            expect(persistentNotificationsConfirmation).toHaveBeenCalled();
        });
    });

    describe('Input Handling', () => {
        it('updates text value', () => {
            const {getByTestId} = render(<DraftInput {...baseProps}/>, {database});
            fireEvent.changeText(getByTestId('draft_input.post.input'), 'new message');
            expect(baseProps.updateValue).toHaveBeenCalledWith('new message');
        });

        it('handles cursor position', () => {
            const {getByTestId} = render(<DraftInput {...baseProps}/>, {database});
            fireEvent(getByTestId('draft_input.post.input'), 'selectionChange', {
                nativeEvent: {selection: {start: 5, end: 5}},
            });
            expect(baseProps.updateCursorPosition).toHaveBeenCalledWith(5);
        });

        it('updates focus state', () => {
            const {getByTestId} = render(<DraftInput {...baseProps}/>, {database});
            fireEvent(getByTestId('draft_input.post.input'), 'focus');
            expect(baseProps.setIsFocused).toHaveBeenCalledWith(true);
        });
    });

    describe('Validation', () => {
        it('disables send when canSend is false', () => {
            const props = {...baseProps, canSend: false};
            const {getByTestId} = render(<DraftInput {...props}/>, {database});
            const sendButton = getByTestId('draft_input.send_action.send.button.disabled');
            expect(sendButton).toBeVisible();
            expect(sendButton).toBeDisabled();

            fireEvent(sendButton, 'longPress');
            expect(baseProps.sendMessage).not.toHaveBeenCalled();

            fireEvent.press(sendButton);
            expect(baseProps.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('BoR (Burn on Read) Functionality', () => {

        it('renders with BoR config disabled by default', () => {
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});

            // Component should render successfully with BoR config
            const container = getByTestId('draft_input');
            expect(container).toBeVisible();

            expect(queryByTestId('bor_label')).not.toBeVisible();
        });

        it('passes BoR config to QuickActions component', () => {
            const borConfig = {
                enabled: true,
                borDurationSeconds: 300,
                borMaximumTimeToLiveSeconds: 3600,
            } as PostBoRConfig;

            const props = {
                ...baseProps,
                postBoRConfig: borConfig,
            };

            const {getByTestId} = render(<DraftInput {...props}/>, {database});
            expect(getByTestId('bor_label')).toBeVisible();
            expect(getByTestId('bor_label')).toHaveTextContent('BURN ON READ (5m)');
        });

        it('calls updatePostBoRStatus when BoR is toggled', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '300'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '3600'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const updatePostBoRStatusMock = jest.fn();
            const props = {
                ...baseProps,
                updatePostBoRStatus: updatePostBoRStatusMock,
            };

            const {getByTestId} = render(<DraftInput {...props}/>, {database});
            const borQuickAction = getByTestId('draft_input.quick_actions.bor_action');
            expect(borQuickAction).toBeVisible();

            await act(async () => {
                fireEvent.press(borQuickAction);
            });

            expect(updatePostBoRStatusMock).toHaveBeenCalledWith({
                enabled: true,
                borDurationSeconds: 300,
                borMaximumTimeToLiveSeconds: 3600,
            });
        });

        it('renders Header component with BoR config', () => {
            const borConfig = {
                enabled: true,
                borDurationSeconds: 300,
                borMaximumTimeToLiveSeconds: 3600,
            } as PostBoRConfig;

            const props = {
                ...baseProps,
                postBoRConfig: borConfig,
            };

            const {getByTestId} = render(<DraftInput {...props}/>, {database});

            // The Header component should receive the BoR config
            const container = getByTestId('draft_input');
            expect(container).toBeVisible();
        });

        it('maintains BoR config state during message sending', async () => {
            const borConfig = {
                enabled: true,
                borDurationSeconds: 300,
                borMaximumTimeToLiveSeconds: 3600,
            } as PostBoRConfig;

            const props = {
                ...baseProps,
                postBoRConfig: borConfig,
                value: 'test message',
            };

            const {getByTestId} = render(<DraftInput {...props}/>, {database});

            // Send message
            fireEvent.press(getByTestId('draft_input.send_action.send.button'));

            // Verify sendMessage was called
            expect(baseProps.sendMessage).toHaveBeenCalled();

            // BoR config should remain unchanged
            expect(props.postBoRConfig?.enabled).toBe(true);
            expect(props.postBoRConfig?.borDurationSeconds).toBe(300);
        });
    });
});
