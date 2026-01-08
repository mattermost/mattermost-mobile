// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {Keyboard} from 'react-native';

import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {act, renderWithEverything} from '@test/intl-test-helper';

import EditCommand from './edit_command';
import EditCommandForm from './edit_command_form';

import type {Database} from '@nozbe/watermelondb';

// Mock the EditCommandForm component
jest.mock('./edit_command_form');
jest.mocked(EditCommandForm).mockImplementation(
    (props) => React.createElement('EditCommandForm', {testID: 'edit-command-form', ...props}),
);

jest.mock('@hooks/android_back_handler');
jest.mock('@screens/navigation');

// Mock expo-router navigation
const mockSetOptions = jest.fn();
const mockRemoveListener = jest.fn();
const mockAddListener = jest.fn(() => mockRemoveListener);
const mockNavigation = {
    setOptions: mockSetOptions,
    addListener: mockAddListener,
};

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => mockNavigation),
}));

const serverUrl = 'some.server.url';

describe('EditCommand', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        CallbackStore.removeCallback();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof EditCommand> {
        return {
            savedCommand: '/test command',
            channelId: 'channel-123',
        };
    }

    it('renders correctly with default props', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<EditCommand {...props}/>, {database});

        const editCommandForm = getByTestId('edit-command-form');
        expect(editCommandForm).toBeTruthy();
        expect(editCommandForm.props.command).toBe(props.savedCommand);
        expect(editCommandForm.props.onCommandChange).toBeDefined();
        expect(editCommandForm.props.channelId).toBe(props.channelId);
    });

    it('renders correctly without saved command, adding a slash automatically', () => {
        const props = getBaseProps();
        props.savedCommand = undefined;
        const {getByTestId} = renderWithEverything(<EditCommand {...props}/>, {database});

        const editCommandForm = getByTestId('edit-command-form');
        expect(editCommandForm.props.command).toBe('/');
    });

    it('sets up navigation header with disabled save button initially', () => {
        const props = getBaseProps();
        renderWithEverything(<EditCommand {...props}/>, {database});

        // navigation.setOptions should be called with headerRight
        expect(mockSetOptions).toHaveBeenCalled();

        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props
        expect(navigationButton.props.testID).toBe('playbooks.edit_command.save.button');
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('updates navigation options when command changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<EditCommand {...props}/>, {database});

        const editCommandForm = getByTestId('edit-command-form');

        // Initially, setOptions should be called
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        act(() => {
            // Simulate command change
            editCommandForm.props.onCommandChange('/new command');
        });

        // setOptions should be called again when command changes (canSave becomes true)
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);

        const afterChangeCallCount = mockSetOptions.mock.calls.length;

        act(() => {
            // Change back to original
            editCommandForm.props.onCommandChange(props.savedCommand);
        });

        // setOptions should be called again when command changes back (canSave becomes false)
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(afterChangeCallCount);
    });

    it('calls updateCommand and closes when save button is pressed', () => {
        const props = getBaseProps();
        const updateCommandMock = jest.fn();

        // Set the callback in CallbackStore
        CallbackStore.setCallback(updateCommandMock);

        renderWithEverything(<EditCommand {...props}/>, {database});

        // Get the headerRight component that was passed to setOptions
        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        const headerRight = setOptionsCall.headerRight;

        // Call the headerRight component to get the NavigationButton element
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;

        // Extract the onPress handler from the NavigationButton props
        const onPress = navigationButton.props.onPress;

        // Simulate save button press by calling the onPress handler
        onPress();

        expect(updateCommandMock).toHaveBeenCalledWith(props.savedCommand);
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
        expect(CallbackStore.getCallback()).toBeUndefined();
    });

    it('closes without updating when close is called', () => {
        const props = getBaseProps();
        const updateCommandMock = jest.fn();

        // Set the callback in CallbackStore
        CallbackStore.setCallback(updateCommandMock);

        renderWithEverything(<EditCommand {...props}/>, {database});

        // Get the handleClose function that was passed to useAndroidHardwareBackHandler
        const handleClose = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];

        // Simulate close
        handleClose();

        expect(updateCommandMock).not.toHaveBeenCalled();
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
        expect(CallbackStore.getCallback()).toBeUndefined();
    });

    it('updates command state when onCommandChange is called', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<EditCommand {...props}/>, {database});

        const editCommandForm = getByTestId('edit-command-form');

        // Change command
        const newCommand = '/new command';
        act(() => {
            editCommandForm.props.onCommandChange(newCommand);
        });

        const updatedForm = getByTestId('edit-command-form');
        expect(updatedForm.props.command).toBe(newCommand);
    });
});
