// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import {AudioModule} from 'expo-audio';
import {File} from 'expo-file-system';
import React from 'react';
import {Alert} from 'react-native';

import {License, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PostPriorityType} from '@constants/post';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import NetworkManager from '@managers/network_manager';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import {persistentNotificationsConfirmation} from '@utils/post';
import {showSnackBar} from '@utils/snack_bar';

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

jest.mock('@mattermost/hardware-keyboard', () => ({
    useHardwareKeyboardEvents: jest.fn(),
}));

// The hardware keyboard only sends from the composer of the screen being shown.
jest.mock('@store/navigation_store', () => ({
    ...jest.requireActual('@store/navigation_store'),
    useCurrentScreen: jest.fn(() => 'channel'),
}));

jest.mock('@utils/post', () => ({
    persistentNotificationsConfirmation: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));

// A short limit keeps the auto-stop test from having to run five minutes of fake time.
jest.mock('@utils/file/voice_note', () => ({
    ...jest.requireActual('@utils/file/voice_note'),
    VOICE_NOTE_MAX_DURATION_MS: 3000,
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
        addFiles: jest.fn(() => true),
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

    describe('Voice note', () => {
        const startRecording = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
            await act(async () => {
                fireEvent.press(getByTestId('draft_input.quick_actions.voice_action'));
            });
            await waitFor(() => {
                expect(getByTestId('draft_input.voice_recorder')).toBeVisible();
            });
        };

        beforeEach(() => {
            enableFakeTimers();
            jest.setSystemTime(new Date(2026, 9, 20, 14, 35, 1));
        });

        afterEach(() => {
            disableFakeTimers();
        });

        it('should replace the quick actions with the recorder while recording', async () => {
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});

            await startRecording(getByTestId);

            expect(queryByTestId('draft_input.quick_actions')).toBeNull();
            expect(queryByTestId('draft_input.send_action.send.button')).toBeNull();
        });

        it('should attach the recorded voice note to the draft when done is pressed', async () => {
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});
            await startRecording(getByTestId);

            await act(async () => {
                await advanceTimers(2000);
                fireEvent.press(getByTestId('draft_input.voice_recorder.done'));
                await advanceTimers(0);
            });

            expect(baseProps.addFiles).toHaveBeenCalledTimes(1);
            expect(baseProps.addFiles).toHaveBeenCalledWith([expect.objectContaining({
                mime_type: 'audio/mp4',
                extension: 'm4a',
                name: 'voice-note-20261020-143501-0m02s.m4a',
                localPath: 'file:///mock/voice-note-20261020-143501-0m02s.m4a',
            })]);
            expect(showSnackBar).not.toHaveBeenCalled();
            expect(queryByTestId('draft_input.voice_recorder')).toBeNull();
            expect(getByTestId('draft_input.quick_actions')).toBeVisible();
        });

        it('should delete the recorded file when the draft does not accept it', async () => {
            const addFiles = jest.fn(() => false);
            const {getByTestId, queryByTestId} = render(
                <DraftInput
                    {...baseProps}
                    addFiles={addFiles}
                />,
                {database},
            );
            await startRecording(getByTestId);

            await act(async () => {
                await advanceTimers(2000);
                fireEvent.press(getByTestId('draft_input.voice_recorder.done'));
                await advanceTimers(0);
            });

            expect(addFiles).toHaveBeenCalledTimes(1);
            const MockFile = jest.mocked(File);
            expect(MockFile).toHaveBeenLastCalledWith('file:///mock/voice-note-20261020-143501-0m02s.m4a');
            expect(MockFile.mock.results[MockFile.mock.results.length - 1].value.delete).toHaveBeenCalledTimes(1);
            expect(showSnackBar).not.toHaveBeenCalled();
            expect(queryByTestId('draft_input.voice_recorder')).toBeNull();
        });

        it('should discard a recording shorter than a second without attaching it', async () => {
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});
            await startRecording(getByTestId);

            await act(async () => {
                fireEvent.press(getByTestId('draft_input.voice_recorder.done'));
            });

            await waitFor(() => {
                expect(queryByTestId('draft_input.voice_recorder')).toBeNull();
            });
            expect(baseProps.addFiles).not.toHaveBeenCalled();
            expect(getByTestId('draft_input.quick_actions')).toBeVisible();
        });

        it('should discard the recording and restore the quick actions on cancel', async () => {
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});
            await startRecording(getByTestId);

            await act(async () => {
                fireEvent.press(getByTestId('draft_input.voice_recorder.cancel'));
            });

            await waitFor(() => {
                expect(queryByTestId('draft_input.voice_recorder')).toBeNull();
            });
            expect(baseProps.addFiles).not.toHaveBeenCalled();
            expect(getByTestId('draft_input.quick_actions')).toBeVisible();
        });

        it('should attach the voice note and tell the user when the recording hits the time limit', async () => {
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});
            await startRecording(getByTestId);

            await act(async () => {
                await advanceTimers(3000);
            });

            expect(baseProps.addFiles).toHaveBeenCalledTimes(1);
            expect(baseProps.addFiles).toHaveBeenCalledWith([expect.objectContaining({name: 'voice-note-20261020-143501-0m03s.m4a'})]);
            expect(showSnackBar).toHaveBeenCalledTimes(1);
            expect(showSnackBar).toHaveBeenCalledWith(expect.objectContaining({barType: SNACK_BAR_TYPE.VOICE_NOTE_MAX_DURATION}));
            expect(queryByTestId('draft_input.voice_recorder')).toBeNull();
        });

        it('should not send the message from a hardware keyboard while recording', async () => {
            const pressHardwareEnter = () => jest.mocked(useHardwareKeyboardEvents).mock.lastCall?.[0].onEnterPressed?.();
            const {getByTestId} = render(
                <DraftInput
                    {...baseProps}
                    value='message'
                />,
                {database},
            );

            pressHardwareEnter();
            expect(baseProps.sendMessage).toHaveBeenCalledTimes(1);

            await startRecording(getByTestId);
            pressHardwareEnter();

            expect(baseProps.sendMessage).toHaveBeenCalledTimes(1);
            expect(getByTestId('draft_input.voice_recorder')).toBeVisible();
        });

        it('should alert and restore the quick actions when the recording fails', async () => {
            jest.spyOn(Alert, 'alert');
            const MockAudioRecorder = AudioModule.AudioRecorder as unknown as jest.Mock;
            const createDefaultRecorder = MockAudioRecorder.getMockImplementation() as () => object;
            MockAudioRecorder.mockImplementationOnce(() => Object.assign(createDefaultRecorder(), {
                prepareToRecordAsync: jest.fn(() => Promise.reject(new Error('mic busy'))),
            }));
            const {getByTestId, queryByTestId} = render(<DraftInput {...baseProps}/>, {database});

            await act(async () => {
                fireEvent.press(getByTestId('draft_input.quick_actions.voice_action'));
            });

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith('Recording failed', 'Unable to record a voice note');
            });
            expect(queryByTestId('draft_input.voice_recorder')).toBeNull();
            expect(getByTestId('draft_input.quick_actions')).toBeVisible();
            expect(baseProps.addFiles).not.toHaveBeenCalled();
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
