// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {Keyboard} from 'react-native';

import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {popTopScreen, setButtons} from '@screens/navigation';
import {act, renderWithEverything} from '@test/intl-test-helper';

import EditCommand from './edit_command';
import EditCommandForm from './edit_command_form';

import type {Database} from '@nozbe/watermelondb';

// Mock the EditCommandForm component
jest.mock('./edit_command_form');
jest.mocked(EditCommandForm).mockImplementation(
    (props) => React.createElement('EditCommandForm', {testID: 'edit-command-form', ...props}),
);

jest.mock('@hooks/navigation_button_pressed');
jest.mock('@hooks/android_back_handler');

const serverUrl = 'some.server.url';

describe('EditCommand', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof EditCommand> {
        return {
            componentId: 'EditCommand' as const,
            savedCommand: '/test command',
            updateCommand: jest.fn(),
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

    it('sets up navigation buttons correctly', () => {
        const props = getBaseProps();
        renderWithEverything(<EditCommand {...props}/>, {database});

        expect(setButtons).toHaveBeenCalledWith(props.componentId, {
            rightButtons: [expect.objectContaining({
                id: 'save-command',
                enabled: false,
                showAsAction: 'always',
                text: 'Save',
            })],
        });
    });

    it('enables save button when command changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<EditCommand {...props}/>, {database});

        const editCommandForm = getByTestId('edit-command-form');

        // Initially, save button should be disabled
        expect(setButtons).toHaveBeenCalledWith(props.componentId, {
            rightButtons: [expect.objectContaining({enabled: false})],
        });

        jest.mocked(setButtons).mockClear();

        act(() => {
            // Simulate command change
            editCommandForm.props.onCommandChange('/new command');
        });

        // Save button should now be enabled
        expect(setButtons).toHaveBeenCalledWith(props.componentId, {
            rightButtons: [expect.objectContaining({enabled: true})],
        });

        jest.mocked(setButtons).mockClear();

        act(() => {
            // Change back to original
            editCommandForm.props.onCommandChange(props.savedCommand);
        });

        // Save button should now be enabled
        expect(setButtons).toHaveBeenCalledWith(props.componentId, {
            rightButtons: [expect.objectContaining({enabled: false})],
        });
    });

    it('calls updateCommand and closes when save button is pressed', () => {
        const props = getBaseProps();
        const updateCommandMock = jest.fn();
        props.updateCommand = updateCommandMock;

        renderWithEverything(<EditCommand {...props}/>, {database});

        // Get the onEditCommand function that was passed to useNavButtonPressed
        const onEditCommand = jest.mocked(useNavButtonPressed).mock.calls[0][2];

        // Simulate save button press
        onEditCommand();

        expect(updateCommandMock).toHaveBeenCalledWith(props.savedCommand);
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(props.componentId);
    });

    it('closes without updating when close is called', () => {
        const props = getBaseProps();
        const updateCommandMock = jest.fn();
        props.updateCommand = updateCommandMock;

        renderWithEverything(<EditCommand {...props}/>, {database});

        // Get the handleClose function that was passed to useAndroidHardwareBackHandler
        const handleClose = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];

        // Simulate close
        handleClose();

        expect(updateCommandMock).not.toHaveBeenCalled();
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(props.componentId);
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
