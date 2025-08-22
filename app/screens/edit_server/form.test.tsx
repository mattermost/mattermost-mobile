// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {getDefaultThemeByAppearance} from '@context/theme';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditServerForm from './form';

const defaultProps = {
    buttonDisabled: false,
    connecting: false,
    displayName: 'Test Server',
    displayNameError: undefined,
    handleUpdate: jest.fn(),
    handleDisplayNameTextChanged: jest.fn(),
    handlePreauthSecretTextChanged: jest.fn(),
    handlePreauthSecretFocus: jest.fn(),
    keyboardAwareRef: {current: null},
    serverUrl: 'https://example.com',
    preauthSecret: '',
    theme: getDefaultThemeByAppearance(),
};

describe('EditServerForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render form with display name input', () => {
        renderWithIntlAndTheme(<EditServerForm {...defaultProps}/>);

        expect(screen.getByTestId('edit_server_form.server_display_name.input')).toBeTruthy();
        expect(screen.getByTestId('edit_server_form.display_help')).toBeTruthy();
        expect(screen.getByTestId('edit_server_form.save.button')).toBeTruthy();
    });

    it('should render advanced options toggle', () => {
        renderWithIntlAndTheme(<EditServerForm {...defaultProps}/>);

        expect(screen.getByTestId('edit_server_form.advanced_options.toggle')).toBeTruthy();
        expect(screen.getByText('Advanced Options')).toBeTruthy();
    });

    it('should show/hide pre-shared secret field when toggled', () => {
        renderWithIntlAndTheme(<EditServerForm {...defaultProps}/>);

        // Initially, pre-shared secret field should not be visible
        expect(screen.queryByTestId('edit_server_form.preauth_secret.input')).toBeNull();
        expect(screen.queryByTestId('edit_server_form.preauth_secret_help')).toBeNull();

        // Toggle advanced options
        const toggle = screen.getByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(toggle);

        // Now pre-shared secret field should be visible
        expect(screen.getByTestId('edit_server_form.preauth_secret.input')).toBeTruthy();
        expect(screen.getByTestId('edit_server_form.preauth_secret_help')).toBeTruthy();

        // Toggle again to hide
        fireEvent.press(toggle);
        expect(screen.queryByTestId('edit_server_form.preauth_secret.input')).toBeNull();
    });

    it('should call handleDisplayNameTextChanged when display name changes', () => {
        const mockHandler = jest.fn();
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                handleDisplayNameTextChanged={mockHandler}
            />,
        );

        const displayNameInput = screen.getByTestId('edit_server_form.server_display_name.input');
        fireEvent.changeText(displayNameInput, 'New Server Name');

        expect(mockHandler).toHaveBeenCalledWith('New Server Name');
    });

    it('should call handlePreauthSecretTextChanged when secret changes', () => {
        const mockHandler = jest.fn();
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                handlePreauthSecretTextChanged={mockHandler}
            />,
        );

        // Open advanced options first
        const toggle = screen.getByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(toggle);

        const preauthSecretInput = screen.getByTestId('edit_server_form.preauth_secret.input');
        fireEvent.changeText(preauthSecretInput, 'new-secret');

        expect(mockHandler).toHaveBeenCalledWith('new-secret');
    });

    it('should call handlePreauthSecretFocus when preauth secret field is focused', () => {
        const mockHandler = jest.fn();
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                handlePreauthSecretFocus={mockHandler}
            />,
        );

        // Open advanced options first
        const toggle = screen.getByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(toggle);

        const preauthSecretInput = screen.getByTestId('edit_server_form.preauth_secret.input');
        fireEvent(preauthSecretInput, 'focus');

        expect(mockHandler).toHaveBeenCalled();
    });

    it('should call handleUpdate when save button is pressed', () => {
        const mockHandler = jest.fn();
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                handleUpdate={mockHandler}
            />,
        );

        const saveButton = screen.getByTestId('edit_server_form.save.button');
        fireEvent.press(saveButton);

        expect(mockHandler).toHaveBeenCalled();
    });

    it('should show connecting state when connecting is true', () => {
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                connecting={true}
            />);

        expect(screen.getByText('Saving')).toBeTruthy();
    });

    it('should disable save button when buttonDisabled is true', () => {
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                buttonDisabled={true}
            />);

        const saveButton = screen.getByTestId('edit_server_form.save.button.disabled');
        expect(saveButton).toBeTruthy();
    });

    it('should show display name error when provided', () => {
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                displayNameError='Server name already exists'
            />,
        );

        expect(screen.getByText('Server name already exists')).toBeTruthy();

        // Help text should not be shown when there's an error
        expect(screen.queryByTestId('edit_server_form.display_help')).toBeNull();
    });

    it('should show correct server URL in help text', () => {
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                serverUrl='https://mattermost.example.com'
            />,
        );

        expect(screen.getByText('Server: mattermost.example.com')).toBeTruthy();
    });

    it('should have correct return key type based on advanced options state', () => {
        renderWithIntlAndTheme(<EditServerForm {...defaultProps}/>);

        const displayNameInput = screen.getByTestId('edit_server_form.server_display_name.input');
        expect(displayNameInput).toHaveProp('returnKeyType', 'done');

        // Toggle advanced options
        const toggle = screen.getByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(toggle);

        // Return key type should now be 'next' since advanced options are shown
        expect(displayNameInput).toHaveProp('returnKeyType', 'next');
    });

    it('should configure pre-shared secret input correctly', () => {
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                preauthSecret='test-value'
            />);

        // Open advanced options
        const toggle = screen.getByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(toggle);

        const preauthSecretInput = screen.getByTestId('edit_server_form.preauth_secret.input');

        expect(preauthSecretInput).toHaveProp('value', 'test-value');
        expect(preauthSecretInput).toHaveProp('secureTextEntry', true);
        expect(preauthSecretInput).toHaveProp('returnKeyType', 'done');
        expect(preauthSecretInput).toHaveProp('autoCorrect', false);
        expect(preauthSecretInput).toHaveProp('autoCapitalize', 'none');
        expect(preauthSecretInput).toHaveProp('spellCheck', false);
    });

    it('should submit to pre-shared secret field when display name submitted with advanced options open', () => {
        const mockHandler = jest.fn();
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                handleUpdate={mockHandler}
            />,
        );

        // Open advanced options first
        const toggle = screen.getByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(toggle);

        const displayNameInput = screen.getByTestId('edit_server_form.server_display_name.input');
        fireEvent(displayNameInput, 'submitEditing');

        // Should NOT call handleUpdate since advanced options are open
        expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should submit form when display name submitted with advanced options closed', () => {
        const mockHandler = jest.fn();
        renderWithIntlAndTheme(
            <EditServerForm
                {...defaultProps}
                handleUpdate={mockHandler}
            />,
        );

        const displayNameInput = screen.getByTestId('edit_server_form.server_display_name.input');
        fireEvent(displayNameInput, 'submitEditing');

        // Should call handleUpdate since no advanced options are open
        expect(mockHandler).toHaveBeenCalled();
    });
});
