// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import Autocomplete from '@components/autocomplete';
import FloatingTextInput from '@components/floating_text_input_label';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import EditCommandForm from './edit_command_form';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@components/floating_text_input_label', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingTextInput).mockImplementation((props) => React.createElement('FloatingTextInput', {...props}));

jest.mock('@components/autocomplete', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Autocomplete).mockImplementation((props) => React.createElement('Autocomplete', {testID: 'autocomplete', ...props}));

const serverUrl = 'some.server.url';

describe('EditCommandForm', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;

        // Reset all mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof EditCommandForm> {
        return {
            command: '/test command',
            onCommandChange: jest.fn(),
            channelId: 'channel-123',
        };
    }

    it('renders correctly with default props', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<EditCommandForm {...props}/>, {database});

        const floatingTextInput = getByTestId('playbooks.edit_command.input');
        expect(floatingTextInput).toBeTruthy();
        expect(floatingTextInput).toHaveProp('value', props.command);
        expect(floatingTextInput).toHaveProp('onChangeText', props.onCommandChange);
        expect(floatingTextInput).toHaveProp('autoCorrect', false);
        expect(floatingTextInput).toHaveProp('autoCapitalize', 'none');
        expect(floatingTextInput).toHaveProp('disableFullscreenUI', true);
        expect(floatingTextInput).toHaveProp('showErrorIcon', false);
        expect(floatingTextInput).toHaveProp('spellCheck', false);
        expect(floatingTextInput).toHaveProp('disableFullscreenUI', true);
        expect(floatingTextInput).toHaveProp('autoFocus', true);

        const autocomplete = getByTestId('autocomplete');
        expect(autocomplete).toBeTruthy();
        expect(autocomplete).toHaveProp('value', props.command);
        expect(autocomplete).toHaveProp('updateValue', props.onCommandChange);
        expect(autocomplete).toHaveProp('cursorPosition', props.command.length);
        expect(autocomplete).toHaveProp('nestedScrollEnabled', true);
        expect(autocomplete).toHaveProp('shouldDirectlyReact', false);
        expect(autocomplete).toHaveProp('channelId', props.channelId);
        expect(autocomplete).toHaveProp('autocompleteProviders', {
            user: false,
            channel: false,
            emoji: false,
            slash: true,
        });
        expect(autocomplete).toHaveProp('useAllAvailableSpace', true);
        expect(autocomplete).toHaveProp('horizontalPadding', 20);
    });

    it('calls onCommandChange when text input changes', () => {
        const props = getBaseProps();
        const onCommandChangeMock = jest.fn();
        props.onCommandChange = onCommandChangeMock;

        const {getByTestId} = renderWithEverything(<EditCommandForm {...props}/>, {database});

        const floatingTextInput = getByTestId('playbooks.edit_command.input');
        const newCommand = '/new command';
        floatingTextInput.props.onChangeText(newCommand);

        expect(onCommandChangeMock).toHaveBeenCalledWith(newCommand);
    });

    it('calls onCommandChange when autocomplete updates value', () => {
        const props = getBaseProps();
        const onCommandChangeMock = jest.fn();
        props.onCommandChange = onCommandChangeMock;

        const {getByTestId} = renderWithEverything(<EditCommandForm {...props}/>, {database});

        const autocomplete = getByTestId('autocomplete');
        const newCommand = '/autocomplete command';
        autocomplete.props.updateValue(newCommand);

        expect(onCommandChangeMock).toHaveBeenCalledWith(newCommand);
    });

    it('updates cursor position when command changes', () => {
        const props = getBaseProps();
        const {getByTestId, rerender} = renderWithEverything(<EditCommandForm {...props}/>, {database});

        const autocomplete = getByTestId('autocomplete');
        expect(autocomplete.props.cursorPosition).toBe(props.command.length);

        // Update command
        const newProps = {...props, command: '/updated command'};
        rerender(<EditCommandForm {...newProps}/>);

        const updatedAutocomplete = getByTestId('autocomplete');
        expect(updatedAutocomplete.props.cursorPosition).toBe(newProps.command.length);
    });
});

