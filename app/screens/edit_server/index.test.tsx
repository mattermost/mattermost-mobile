// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {getDefaultThemeByAppearance} from '@context/theme';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditServer from './index';

import type ServersModel from '@typings/database/models/app/servers';

// Mock dependencies
jest.mock('@database/manager', () => ({
    updateServerDisplayName: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
    setServerCredentials: jest.fn(),
}));

jest.mock('@managers/network_manager', () => ({
    getClient: jest.fn(),
}));

jest.mock('@managers/websocket_manager', () => ({
    createClient: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissModal: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    logWarning: jest.fn(),
}));

jest.mock('@queries/app/servers', () => ({
    getServerByDisplayName: jest.fn(),
}));

// Create mock server
const mockServer: ServersModel = {
    url: 'https://example.com',
    displayName: 'Test Server',
    lastActiveAt: Date.now(),
} as ServersModel;

const defaultProps = {
    componentId: 'EditServer' as any,
    server: mockServer,
    theme: getDefaultThemeByAppearance(),
};

describe('EditServer Screen', () => {
    let mockGetServerCredentials: jest.Mock;
    let mockSetServerCredentials: jest.Mock;
    let mockNetworkManagerGetClient: jest.Mock;
    let mockWebSocketManagerCreateClient: jest.Mock;
    let mockDismissModal: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetServerCredentials = require('@init/credentials').getServerCredentials;
        mockSetServerCredentials = require('@init/credentials').setServerCredentials;
        mockNetworkManagerGetClient = require('@managers/network_manager').getClient;
        mockWebSocketManagerCreateClient = require('@managers/websocket_manager').createClient;
        mockDismissModal = require('@screens/navigation').dismissModal;
    });

    it('should render edit server screen', async () => {
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: undefined,
        });

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(screen.getByTestId('edit_server.screen')).toBeVisible();
        });
    });

    it('should initialize with dummy value when existing password exists', async () => {
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: 'existing-password',
        });

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalledWith('https://example.com');
        });

        // Wait a bit more for the async state update
        await waitFor(() => {
            const passwordInput = screen.queryByTestId('edit_server_form.preauth_secret.input');
            expect(passwordInput).toHaveProp('value', 'keep');
        });
    });

    it('should initialize with empty value when no existing password', async () => {
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: undefined,
        });

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalledWith('https://example.com');
        });

        await waitFor(() => {
            const passwordInput = screen.queryByTestId('edit_server_form.preauth_secret.input');
            expect(passwordInput).toHaveProp('value', '');
        });
    });

    it('should clear field and mark as modified on focus', async () => {
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: 'existing-password',
        });

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        // Wait for initial load
        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalled();
        });

        // Open advanced options first
        const advancedToggle = await screen.findByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(advancedToggle);

        // Focus the password field
        const passwordInput = await screen.findByTestId('edit_server_form.preauth_secret.input');
        fireEvent(passwordInput, 'focus');

        // Field should be cleared and marked as modified
        await waitFor(() => {
            expect(passwordInput).toHaveProp('value', '');
        });
    });

    it('should update credentials only when modified', async () => {
        const mockClient = {
            setClientCredentials: jest.fn(),
        };
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: undefined,
        });
        mockNetworkManagerGetClient.mockReturnValue(mockClient);

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalled();
        });

        // Save without modifying shared password
        const saveButton = await screen.findByTestId('edit_server_form.save.button');
        fireEvent.press(saveButton);

        await waitFor(() => {
            expect(mockDismissModal).toHaveBeenCalled();

            // Should NOT call credential update methods since password wasn't modified
            expect(mockSetServerCredentials).not.toHaveBeenCalled();
            expect(mockClient.setClientCredentials).not.toHaveBeenCalled();
        });
    });

    it('should update credentials when shared password is modified', async () => {
        const mockClient = {
            setClientCredentials: jest.fn(),
        };
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: undefined,
        });
        mockNetworkManagerGetClient.mockReturnValue(mockClient);

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalled();
        });

        // Open advanced options
        const advancedToggle = await screen.findByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(advancedToggle);

        // Type in password field
        const passwordInput = await screen.findByTestId('edit_server_form.preauth_secret.input');
        fireEvent.changeText(passwordInput, 'new-password');

        // Save
        const saveButton = await screen.findByTestId('edit_server_form.save.button');
        fireEvent.press(saveButton);

        await waitFor(() => {
            expect(mockSetServerCredentials).toHaveBeenCalledWith('https://example.com', 'test-token', 'new-password');
            expect(mockClient.setClientCredentials).toHaveBeenCalledWith('test-token', 'new-password');
            expect(mockWebSocketManagerCreateClient).toHaveBeenCalledWith('https://example.com', 'test-token', 'new-password');
        });
    });

    it('should remove password when field is cleared', async () => {
        const mockClient = {
            setClientCredentials: jest.fn(),
        };
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: 'existing-password',
        });
        mockNetworkManagerGetClient.mockReturnValue(mockClient);

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalled();
        });

        // Open advanced options
        const advancedToggle = await screen.findByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(advancedToggle);

        // Focus field (clears "keep")
        const passwordInput = await screen.findByTestId('edit_server_form.preauth_secret.input');
        fireEvent(passwordInput, 'focus');

        // Save with empty field
        const saveButton = await screen.findByTestId('edit_server_form.save.button');
        fireEvent.press(saveButton);

        await waitFor(() => {
            expect(mockSetServerCredentials).toHaveBeenCalledWith('https://example.com', 'test-token', undefined);
            expect(mockClient.setClientCredentials).toHaveBeenCalledWith('test-token', undefined);
            expect(mockWebSocketManagerCreateClient).toHaveBeenCalledWith('https://example.com', 'test-token', undefined);
        });
    });

    it('should handle client update errors gracefully', async () => {
        const mockLogWarning = require('@utils/log').logWarning;
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: undefined,
        });

        // Mock NetworkManager to throw error
        mockNetworkManagerGetClient.mockImplementation(() => {
            throw new Error('Client not found');
        });

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalled();
        });

        // Open advanced options and type password
        const advancedToggle = await screen.findByTestId('edit_server_form.advanced_options.toggle');
        fireEvent.press(advancedToggle);

        const passwordInput = await screen.findByTestId('edit_server_form.preauth_secret.input');
        fireEvent.changeText(passwordInput, 'new-password');

        // Save
        const saveButton = await screen.findByTestId('edit_server_form.save.button');
        fireEvent.press(saveButton);

        await waitFor(() => {
            // Should still save credentials
            expect(mockSetServerCredentials).toHaveBeenCalledWith('https://example.com', 'test-token', 'new-password');

            // Should log warning about client update failure
            expect(mockLogWarning).toHaveBeenCalledWith('Failed to update REST client shared password:', expect.any(Error));
        });
    });

    it('should allow saving with valid display name regardless of changes', async () => {
        mockGetServerCredentials.mockResolvedValue({
            token: 'test-token',
            preauthSecret: undefined,
        });

        renderWithIntlAndTheme(<EditServer {...defaultProps}/>);

        await waitFor(() => {
            expect(mockGetServerCredentials).toHaveBeenCalled();
        });

        // Save button should be enabled with valid display name
        const saveButton = await screen.findByTestId('edit_server_form.save.button');
        expect(saveButton).toBeTruthy();
    });
});
