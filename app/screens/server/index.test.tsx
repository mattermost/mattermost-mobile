// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import {File} from 'expo-file-system';
import React from 'react';

import {doPing} from '@actions/remote/general';
import {Launch, Preferences} from '@constants';
import NetworkManager from '@managers/network_manager';
import {renderWithIntl} from '@test/intl-test-helper';
import {getServerUrlAfterRedirect, sanitizeUrl} from '@utils/url';

import Server from './index';

import type {ServerCaFile} from './form';

// Capture the props the screen passes to the form so the tests can drive it directly.
let mockFormProps: Record<string, any> = {};
jest.mock('./form', () => ({
    __esModule: true,
    default: (props: Record<string, any>) => {
        mockFormProps = props;
        return null;
    },
}));

jest.mock('./header', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@screens/background', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@components/app_version', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@actions/remote/general', () => ({
    doPing: jest.fn(),
}));

jest.mock('@actions/remote/systems', () => ({
    fetchConfigAndLicense: jest.fn(),
}));

jest.mock('@utils/url', () => ({
    ...jest.requireActual('@utils/url'),
    getServerUrlAfterRedirect: jest.fn(),
}));

jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        saveServerCa: jest.fn(),
        invalidateClient: jest.fn(),
    },
}));

jest.mock('@queries/app/servers', () => ({
    ...jest.requireActual('@queries/app/servers'),
    getServerByDisplayName: jest.fn(async () => undefined),
    getServerByIdentifier: jest.fn(async () => undefined),
}));

jest.mock('@init/credentials', () => ({
    ...jest.requireActual('@init/credentials'),
    getServerCredentials: jest.fn(async () => undefined),
}));

jest.mock('@init/push_notifications', () => ({
    __esModule: true,
    default: {registerIfNeeded: jest.fn()},
}));

jest.mock('@managers/security_manager', () => ({
    __esModule: true,
    default: {
        isDeviceJailbroken: jest.fn(async () => false),
        authenticateWithBiometrics: jest.fn(async () => true),
    },
}));

jest.mock('@hooks/screen_transition_animation', () => ({
    useScreenTransitionAnimation: () => ({}),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
    logDebug: jest.fn(),
    logInfo: jest.fn(),
    logWarning: jest.fn(),
}));

describe('Server screen - server CA certificate', () => {
    const typedUrl = 'https://chat.example.com';
    const serverUrl = sanitizeUrl(typedUrl);
    const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n';
    const caFile: ServerCaFile = {name: 'my-ca.pem', uri: 'file:///cache/my-ca.pem'};

    const originalFileImpl = jest.mocked(File).getMockImplementation();

    const mockCaFileText = (text: jest.Mock) => {
        jest.mocked(File).mockImplementation(((uri: string) => ({uri, exists: true, text})) as never);
    };

    const renderServer = () => renderWithIntl(
        <Server
            launchType={Launch.Normal}
            theme={Preferences.THEMES.denim}
        />,
    );

    // Fill in the form through the props the screen passes to it, then press Connect.
    const fillAndConnect = async (serverCaFile?: ServerCaFile) => {
        act(() => {
            mockFormProps.handleUrlTextChanged(typedUrl);
            mockFormProps.handleDisplayNameTextChanged('Chat');
            if (serverCaFile) {
                mockFormProps.setServerCaFile(serverCaFile);
            }
        });

        await waitFor(() => expect(mockFormProps.buttonDisabled).toBe(false));

        await act(async () => {
            await mockFormProps.handleConnect();
        });
    };

    beforeEach(() => {
        mockFormProps = {};

        // Stop the connect flow right after the ping; these tests only cover what happens before it.
        jest.mocked(doPing).mockResolvedValue({error: new Error('stop here')} as never);
        jest.mocked(getServerUrlAfterRedirect).mockResolvedValue({url: serverUrl} as never);
        jest.mocked(NetworkManager.saveServerCa).mockReturnValue(false);
    });

    afterEach(() => {
        jest.mocked(File).mockImplementation(originalFileImpl!);
    });

    it('should pass the selected CA file state to the form', () => {
        renderServer();

        expect(mockFormProps.serverCaFile).toBeUndefined();
        expect(mockFormProps.serverCaError).toBeUndefined();

        act(() => {
            mockFormProps.setServerCaFile(caFile);
            mockFormProps.setServerCaError('error');
        });

        expect(mockFormProps.serverCaFile).toEqual(caFile);
        expect(mockFormProps.serverCaError).toBe('error');
    });

    it('should save the selected CA and recreate the client before pinging', async () => {
        const text = jest.fn(async () => pem);
        mockCaFileText(text);
        jest.mocked(NetworkManager.saveServerCa).mockReturnValue(true);
        renderServer();

        await fillAndConnect(caFile);

        await waitFor(() => expect(doPing).toHaveBeenCalled());
        expect(File).toHaveBeenCalledWith(caFile.uri);
        expect(text).toHaveBeenCalled();
        expect(NetworkManager.saveServerCa).toHaveBeenCalledWith(serverUrl, pem);
        expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(jest.mocked(doPing).mock.calls[0][0]).toBe(serverUrl);

        // The CA has to be stored before the ping creates its client.
        const saveOrder = jest.mocked(NetworkManager.saveServerCa).mock.invocationCallOrder[0];
        const pingOrder = jest.mocked(doPing).mock.invocationCallOrder[0];
        expect(saveOrder).toBeLessThan(pingOrder);
    });

    it('should skip the redirect check when a CA is selected', async () => {
        mockCaFileText(jest.fn(async () => pem));
        renderServer();

        await fillAndConnect(caFile);

        await waitFor(() => expect(doPing).toHaveBeenCalled());
        expect(getServerUrlAfterRedirect).not.toHaveBeenCalled();
    });

    it('should clear any stored CA and use the redirect check when no CA is selected', async () => {
        renderServer();

        await fillAndConnect();

        await waitFor(() => expect(doPing).toHaveBeenCalled());
        expect(getServerUrlAfterRedirect).toHaveBeenCalledWith(typedUrl, false, undefined);
        expect(NetworkManager.saveServerCa).toHaveBeenCalledWith(serverUrl, undefined);
        expect(NetworkManager.invalidateClient).not.toHaveBeenCalled();
    });

    it('should show an error and open advanced options when the CA file cannot be read', async () => {
        mockCaFileText(jest.fn(async () => {
            throw new Error('read failed');
        }));
        renderServer();

        await fillAndConnect(caFile);

        await waitFor(() => {
            expect(mockFormProps.serverCaError).toBe('Could not apply the selected CA certificate');
        });
        expect(mockFormProps.showAdvancedOptions).toBe(true);
        expect(mockFormProps.connecting).toBe(false);
        expect(NetworkManager.saveServerCa).not.toHaveBeenCalled();
        expect(doPing).not.toHaveBeenCalled();
    });
});
